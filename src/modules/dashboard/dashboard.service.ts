import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument, VehicleStatus, FuelType, LeaseType } from '../vehicles/schemas/vehicle.schema';
import { Maintenance, MaintenanceDocument, MaintenanceStatus } from '../maintenance/schemas/maintenance.schema';
import { LogbookSession, LogbookSessionDocument, LogbookSessionStatus } from '../logbooksession-ato-compliance/schemas/logbook-session.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Maintenance.name) private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(LogbookSession.name) private logbookSessionModel: Model<LogbookSessionDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async getStats(agencyId: string, role?: string) {
    const aid = agencyId ? new Types.ObjectId(agencyId) : null;
    const isPrincipal = role === 'PRINCIPAL';

    // Helper to create filter
    const getFilter = (additionalFilters: any = {}) => {
      if (isPrincipal) return additionalFilters;
      return { agencyId: aid, ...additionalFilters };
    };

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
      this.vehicleModel.countDocuments(getFilter()),
      this.vehicleModel.countDocuments(getFilter({ vehicleStatus: VehicleStatus.ACTIVATE })),
      this.vehicleModel.countDocuments(getFilter({ vehicleStatus: VehicleStatus.ASSIGNED })),
      this.vehicleModel.countDocuments(getFilter({ vehicleStatus: VehicleStatus.UNDER_AGREEMENT })),
      this.vehicleModel.countDocuments(getFilter({ vehicleStatus: VehicleStatus.IN_MAINTENANCE })),
      this.vehicleModel.countDocuments(getFilter({ vehicleStatus: VehicleStatus.DEACTIVATE })),

      // Fuel Distribution
      this.vehicleModel.countDocuments(getFilter({ fuelType: FuelType.PETROL })),
      this.vehicleModel.countDocuments(getFilter({ fuelType: FuelType.DIESEL })),
      this.vehicleModel.countDocuments(getFilter({ fuelType: FuelType.HYBRID })),
      this.vehicleModel.countDocuments(getFilter({ fuelType: FuelType.EV })),

      // Lease Distribution
      this.vehicleModel.countDocuments(getFilter({ leaseType: LeaseType.OWNED })),
      this.vehicleModel.countDocuments(getFilter({ leaseType: LeaseType.LOAN })),

      // Maintenance Stats
      this.maintenanceModel.countDocuments(getFilter({ status: MaintenanceStatus.SUBMITTED })),
      this.maintenanceModel.countDocuments(getFilter({ status: MaintenanceStatus.APPROVED })),
      this.maintenanceModel.countDocuments(getFilter({ status: MaintenanceStatus.REJECTED })),
      this.maintenanceModel.countDocuments(getFilter({ status: MaintenanceStatus.COMPLETED })),

      // Logbook Session Stats
      this.logbookSessionModel.countDocuments(getFilter({ status: LogbookSessionStatus.DRAFT })),
      this.logbookSessionModel.countDocuments(getFilter({ status: LogbookSessionStatus.LOCKED })),
      // Driver Stats
      this.driverModel.countDocuments(getFilter()),
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
