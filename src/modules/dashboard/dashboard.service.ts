import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument, VehicleStatus, FuelType, LeaseType } from '../vehicles/schemas/vehicle.schema';
import { Maintenance, MaintenanceDocument, MaintenanceStatus } from '../maintenance/schemas/maintenance.schema';
import { LogbookSession, LogbookSessionDocument, LogbookSessionStatus } from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { Agency, AgencyDocument } from '../../agencies/schemas/agency.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Maintenance.name) private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(LogbookSession.name) private logbookSessionModel: Model<LogbookSessionDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Agency.name) private agencyModel: Model<AgencyDocument>,
  ) {}

  async getStats(agencyId: string, role?: string) {
    const isPrincipal = role === 'PRINCIPAL';

    if (!isPrincipal) {
      return this.getSingleAgencyStats(agencyId);
    }

    // Principal: Get all agencies and their stats
    const agencies = await this.agencyModel.find({ isActive: true }, 'agencyName').exec();
    
    const [
      vehicleStats,
      maintenanceStats,
      logbookStats,
      driverStats,
    ] = await Promise.all([
      // 1. Vehicle Stats Grouped by Agency
      this.vehicleModel.aggregate([
        {
          $group: {
            _id: '$agencyId',
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$vehicleStatus', VehicleStatus.ACTIVATE] }, 1, 0] } },
            assigned: { $sum: { $cond: [{ $eq: ['$vehicleStatus', VehicleStatus.ASSIGNED] }, 1, 0] } },
            underAgreement: { $sum: { $cond: [{ $eq: ['$vehicleStatus', VehicleStatus.UNDER_AGREEMENT] }, 1, 0] } },
            inMaintenance: { $sum: { $cond: [{ $eq: ['$vehicleStatus', VehicleStatus.IN_MAINTENANCE] }, 1, 0] } },
            deactivated: { $sum: { $cond: [{ $eq: ['$vehicleStatus', VehicleStatus.DEACTIVATE] }, 1, 0] } },
            petrol: { $sum: { $cond: [{ $eq: ['$fuelType', FuelType.PETROL] }, 1, 0] } },
            diesel: { $sum: { $cond: [{ $eq: ['$fuelType', FuelType.DIESEL] }, 1, 0] } },
            hybrid: { $sum: { $cond: [{ $eq: ['$fuelType', FuelType.HYBRID] }, 1, 0] } },
            ev: { $sum: { $cond: [{ $eq: ['$fuelType', FuelType.EV] }, 1, 0] } },
            owned: { $sum: { $cond: [{ $eq: ['$leaseType', LeaseType.OWNED] }, 1, 0] } },
            loan: { $sum: { $cond: [{ $eq: ['$leaseType', LeaseType.LOAN] }, 1, 0] } },
          },
        },
      ]),

      // 2. Maintenance Stats Grouped by Agency
      this.maintenanceModel.aggregate([
        {
          $group: {
            _id: '$agencyId',
            submitted: { $sum: { $cond: [{ $eq: ['$status', MaintenanceStatus.SUBMITTED] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', MaintenanceStatus.APPROVED] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', MaintenanceStatus.REJECTED] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', MaintenanceStatus.COMPLETED] }, 1, 0] } },
          },
        },
      ]),

      // 3. Logbook Session Stats Grouped by Agency
      this.logbookSessionModel.aggregate([
        {
          $group: {
            _id: '$agencyId',
            draft: { $sum: { $cond: [{ $eq: ['$status', LogbookSessionStatus.DRAFT] }, 1, 0] } },
            locked: { $sum: { $cond: [{ $eq: ['$status', LogbookSessionStatus.LOCKED] }, 1, 0] } },
          },
        },
      ]),

      // 4. Driver Stats Grouped by Agency
      this.driverModel.aggregate([
        {
          $group: {
            _id: '$agencyId',
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Map stats back to agencies
    const agencyStats = agencies.map(agency => {
      const aidStr = agency._id.toString();
      const v = vehicleStats.find(s => s._id?.toString() === aidStr) || {};
      const m = maintenanceStats.find(s => s._id?.toString() === aidStr) || {};
      const l = logbookStats.find(s => s._id?.toString() === aidStr) || {};
      const d = driverStats.find(s => s._id?.toString() === aidStr) || {};

      return {
        agencyId: agency._id,
        agencyName: agency.agencyName,
        stats: {
          vehicles: {
            total: v.total || 0,
            active: v.active || 0,
            assigned: v.assigned || 0,
            underAgreement: v.underAgreement || 0,
            inMaintenance: v.inMaintenance || 0,
            deactivated: v.deactivated || 0,
          },
          fuelDistribution: {
            petrol: v.petrol || 0,
            diesel: v.diesel || 0,
            hybrid: v.hybrid || 0,
            ev: v.ev || 0,
          },
          leaseDistribution: {
            owned: v.owned || 0,
            loan: v.loan || 0,
          },
          maintenance: {
            submitted: m.submitted || 0,
            approved: m.approved || 0,
            rejected: m.rejected || 0,
            completed: m.completed || 0,
          },
          logbookSessions: {
            draft: l.draft || 0,
            locked: l.locked || 0,
          },
          drivers: {
            total: d.total || 0,
          },
        },
      };
    });

    // Create Global Summary
    const summary = {
      vehicles: {
        total: vehicleStats.reduce((acc, curr) => acc + (curr.total || 0), 0),
        active: vehicleStats.reduce((acc, curr) => acc + (curr.active || 0), 0),
        assigned: vehicleStats.reduce((acc, curr) => acc + (curr.assigned || 0), 0),
        underAgreement: vehicleStats.reduce((acc, curr) => acc + (curr.underAgreement || 0), 0),
        inMaintenance: vehicleStats.reduce((acc, curr) => acc + (curr.inMaintenance || 0), 0),
        deactivated: vehicleStats.reduce((acc, curr) => acc + (curr.deactivated || 0), 0),
      },
      fuelDistribution: {
        petrol: vehicleStats.reduce((acc, curr) => acc + (curr.petrol || 0), 0),
        diesel: vehicleStats.reduce((acc, curr) => acc + (curr.diesel || 0), 0),
        hybrid: vehicleStats.reduce((acc, curr) => acc + (curr.hybrid || 0), 0),
        ev: vehicleStats.reduce((acc, curr) => acc + (curr.ev || 0), 0),
      },
      leaseDistribution: {
        owned: vehicleStats.reduce((acc, curr) => acc + (curr.owned || 0), 0),
        loan: vehicleStats.reduce((acc, curr) => acc + (curr.loan || 0), 0),
      },
      maintenance: {
        submitted: maintenanceStats.reduce((acc, curr) => acc + (curr.submitted || 0), 0),
        approved: maintenanceStats.reduce((acc, curr) => acc + (curr.approved || 0), 0),
        rejected: maintenanceStats.reduce((acc, curr) => acc + (curr.rejected || 0), 0),
        completed: maintenanceStats.reduce((acc, curr) => acc + (curr.completed || 0), 0),
      },
      logbookSessions: {
        draft: logbookStats.reduce((acc, curr) => acc + (curr.draft || 0), 0),
        locked: logbookStats.reduce((acc, curr) => acc + (curr.locked || 0), 0),
      },
      drivers: {
        total: driverStats.reduce((acc, curr) => acc + (curr.total || 0), 0),
      },
    };

    return {
      summary,
      agencyStats,
    };
  }

  private async getSingleAgencyStats(agencyId: string) {
    const aid = new Types.ObjectId(agencyId);
    const filter = { agencyId: aid };

    const [
      totalVehicles,
      activeVehicles,
      assignedVehicles,
      underAgreementVehicles,
      inMaintenanceVehicles,
      deactivatedVehicles,
      // Fuel
      petrolCount,
      dieselCount,
      hybridCount,
      evCount,
      // Lease
      ownedCount,
      loanCount,
      // Maintenance
      submittedMaint,
      approvedMaint,
      rejectedMaint,
      completedMaint,
      // Logbook
      draftSessions,
      lockedSessions,
      // Driver Stats
      totalDrivers,
    ] = await Promise.all([
      // Vehicle Stats
      this.vehicleModel.countDocuments(filter),
      this.vehicleModel.countDocuments({ ...filter, vehicleStatus: VehicleStatus.ACTIVATE }),
      this.vehicleModel.countDocuments({ ...filter, vehicleStatus: VehicleStatus.ASSIGNED }),
      this.vehicleModel.countDocuments({ ...filter, vehicleStatus: VehicleStatus.UNDER_AGREEMENT }),
      this.vehicleModel.countDocuments({ ...filter, vehicleStatus: VehicleStatus.IN_MAINTENANCE }),
      this.vehicleModel.countDocuments({ ...filter, vehicleStatus: VehicleStatus.DEACTIVATE }),

      // Fuel Distribution
      this.vehicleModel.countDocuments({ ...filter, fuelType: FuelType.PETROL }),
      this.vehicleModel.countDocuments({ ...filter, fuelType: FuelType.DIESEL }),
      this.vehicleModel.countDocuments({ ...filter, fuelType: FuelType.HYBRID }),
      this.vehicleModel.countDocuments({ ...filter, fuelType: FuelType.EV }),

      // Lease Distribution
      this.vehicleModel.countDocuments({ ...filter, leaseType: LeaseType.OWNED }),
      this.vehicleModel.countDocuments({ ...filter, leaseType: LeaseType.LOAN }),

      // Maintenance Stats
      this.maintenanceModel.countDocuments({ ...filter, status: MaintenanceStatus.SUBMITTED }),
      this.maintenanceModel.countDocuments({ ...filter, status: MaintenanceStatus.APPROVED }),
      this.maintenanceModel.countDocuments({ ...filter, status: MaintenanceStatus.REJECTED }),
      this.maintenanceModel.countDocuments({ ...filter, status: MaintenanceStatus.COMPLETED }),

      // Logbook Session Stats
      this.logbookSessionModel.countDocuments({ ...filter, status: LogbookSessionStatus.DRAFT }),
      this.logbookSessionModel.countDocuments({ ...filter, status: LogbookSessionStatus.LOCKED }),
      // Driver Stats
      this.driverModel.countDocuments(filter),
    ]);

    return {
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        assigned: assignedVehicles,
        underAgreement: underAgreementVehicles,
        inMaintenance: inMaintenanceVehicles,
        deactivated: deactivatedVehicles,
      },
      fuelDistribution: {
        petrol: petrolCount,
        diesel: dieselCount,
        hybrid: hybridCount,
        ev: evCount,
      },
      leaseDistribution: {
        owned: ownedCount,
        loan: loanCount,
      },
      maintenance: {
        submitted: submittedMaint,
        approved: approvedMaint,
        rejected: rejectedMaint,
        completed: completedMaint,
      },
      logbookSessions: {
        draft: draftSessions,
        locked: lockedSessions,
      },
      drivers: {
        total: totalDrivers,
      },
    };
  }
}
