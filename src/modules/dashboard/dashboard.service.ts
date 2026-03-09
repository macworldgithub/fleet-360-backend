import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument, VehicleStatus, FuelType, LeaseType } from '../vehicles/schemas/vehicle.schema';
import { Maintenance, MaintenanceDocument, MaintenanceStatus } from '../maintenance/schemas/maintenance.schema';
import { LogbookSession, LogbookSessionDocument, LogbookSessionStatus } from '../logbooksession-ato-compliance/schemas/logbook-session.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Maintenance.name) private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(LogbookSession.name) private logbookSessionModel: Model<LogbookSessionDocument>,
  ) {}

  async getStats(agencyId: string) {
    const aid = new Types.ObjectId(agencyId);

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
    ] = await Promise.all([
      // Vehicle Stats
      this.vehicleModel.countDocuments({ agencyId: aid }),
      this.vehicleModel.countDocuments({ agencyId: aid, vehicleStatus: VehicleStatus.ACTIVATE }),
      this.vehicleModel.countDocuments({ agencyId: aid, vehicleStatus: VehicleStatus.ASSIGNED }),
      this.vehicleModel.countDocuments({ agencyId: aid, vehicleStatus: VehicleStatus.UNDER_AGREEMENT }),
      this.vehicleModel.countDocuments({ agencyId: aid, vehicleStatus: VehicleStatus.IN_MAINTENANCE }),
      this.vehicleModel.countDocuments({ agencyId: aid, vehicleStatus: VehicleStatus.DEACTIVATE }),

      // Fuel Distribution
      this.vehicleModel.countDocuments({ agencyId: aid, fuelType: FuelType.PETROL }),
      this.vehicleModel.countDocuments({ agencyId: aid, fuelType: FuelType.DIESEL }),
      this.vehicleModel.countDocuments({ agencyId: aid, fuelType: FuelType.HYBRID }),
      this.vehicleModel.countDocuments({ agencyId: aid, fuelType: FuelType.EV }),

      // Lease Distribution
      this.vehicleModel.countDocuments({ agencyId: aid, leaseType: LeaseType.OWNED }),
      this.vehicleModel.countDocuments({ agencyId: aid, leaseType: LeaseType.LOAN }),

      // Maintenance Stats
      this.maintenanceModel.countDocuments({ agencyId: aid, status: MaintenanceStatus.SUBMITTED }),
      this.maintenanceModel.countDocuments({ agencyId: aid, status: MaintenanceStatus.APPROVED }),
      this.maintenanceModel.countDocuments({ agencyId: aid, status: MaintenanceStatus.REJECTED }),
      this.maintenanceModel.countDocuments({ agencyId: aid, status: MaintenanceStatus.COMPLETED }),

      // Logbook Session Stats
      this.logbookSessionModel.countDocuments({ agencyId: aid, status: LogbookSessionStatus.DRAFT }),
      this.logbookSessionModel.countDocuments({ agencyId: aid, status: LogbookSessionStatus.LOCKED }),
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
    };
  }
}
