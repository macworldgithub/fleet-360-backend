import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import { FuelTransaction, FuelTransactionDocument } from '../fuel/schemas/fuel-transaction.schema';
import { Maintenance, MaintenanceDocument, MaintenanceStatus } from '../maintenance/schemas/maintenance.schema';
import { Incident, IncidentDocument } from '../incidents/schemas/incident.schema';
import { KmLog, KmLogDocument } from '../km-logs/schemas/km-log.schema';


@Injectable()
export class CostIntelligenceService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(FuelTransaction.name) private fuelModel: Model<FuelTransactionDocument>,
    @InjectModel(Maintenance.name) private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(Incident.name) private incidentModel: Model<IncidentDocument>,
    @InjectModel(KmLog.name) private kmLogModel: Model<KmLogDocument>,
  ) {}

  // Vehicle Cost Summary
  async getVehicleCostSummary(vehicleId: string) {
    const objectId = new Types.ObjectId(vehicleId);

    const vehicle = await this.vehicleModel.findById(objectId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const [fuel, maintenance, incidents, distance] = await Promise.all([
      this.fuelModel.aggregate([
        { $match: { vehicleId: objectId, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$totalCost' } } },
      ]),
      this.maintenanceModel.aggregate([
        { $match: { vehicleId: objectId, status: MaintenanceStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } },
      ]),
      this.incidentModel.aggregate([
        { $match: { vehicleId: objectId, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$estimatedRepairCost' } } },
      ]),
      this.kmLogModel.aggregate([
        { $match: { vehicleId: objectId } },
        { $group: { _id: null, total: { $sum: '$distanceInKms' } } },
      ]),
    ]);

    const fuelCost = fuel[0]?.total || 0;
    const maintenanceCost = maintenance[0]?.total || 0;
    const incidentCost = incidents[0]?.total || 0;
    const totalDistance = distance[0]?.total || 0;

    const purchaseCost = vehicle.purchaseCost || 0;
    const totalRunningCost = fuelCost + maintenanceCost + incidentCost;
    const totalCost = purchaseCost + totalRunningCost;
    const costPerKm = totalDistance > 0 ? totalRunningCost / totalDistance : 0;

    return {
      vehicleId,
      purchaseCost,
      fuelCost,
      maintenanceCost,
      incidentCost,
      totalRunningCost,
      totalCost,
      totalDistance,
      costPerKm,
    };
  }

  // Vehicle Cost Breakdown
  async getVehicleCostBreakdown(vehicleId: string) {
    const summary = await this.getVehicleCostSummary(vehicleId);

    return {
      purchaseCost: summary.purchaseCost,
      fuelCost: summary.fuelCost,
      maintenanceCost: summary.maintenanceCost,
      incidentRepairCost: summary.incidentCost,
      totalCost: summary.totalCost,
    };
  }

  // Agency Fleet Cost Summary
  async getFleetCostSummary(agencyId: string, role?: string) {
    const isPrincipal = role === 'PRINCIPAL';
    const objectId = new Types.ObjectId(agencyId);
    
    const matchQuery: any = {};
    if (!isPrincipal) {
      matchQuery.agencyId = objectId;
    }

    const [fuel, maintenance, incidents, distance, vehicleCount] =
      await Promise.all([
        this.fuelModel.aggregate([
          { $match: { ...matchQuery, isDeleted: false } },
          { $group: { _id: null, total: { $sum: '$totalCost' } } },
        ]),
        this.maintenanceModel.aggregate([
          { $match: { ...matchQuery, status: MaintenanceStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$actualCost' } } },
        ]),
        this.incidentModel.aggregate([
          { $match: { ...matchQuery, isDeleted: false } },
          { $group: { _id: null, total: { $sum: '$estimatedRepairCost' } } },
        ]),
        this.kmLogModel.aggregate([
          { $match: matchQuery },
          { $group: { _id: null, total: { $sum: '$distanceInKms' } } },
        ]),
        this.vehicleModel.countDocuments(matchQuery),
      ]);

    const fuelCost = fuel[0]?.total || 0;
    const maintenanceCost = maintenance[0]?.total || 0;
    const incidentCost = incidents[0]?.total || 0;
    const totalDistance = distance[0]?.total || 0;

    const totalFleetCost = fuelCost + maintenanceCost + incidentCost;
    const averageCostPerVehicle =
      vehicleCount > 0 ? totalFleetCost / vehicleCount : 0;
    const costPerKm =
      totalDistance > 0 ? totalFleetCost / totalDistance : 0;

    return {
      agencyId,
      totalFleetCost,
      fuelCost,
      maintenanceCost,
      incidentCost,
      totalDistance,
      vehicleCount,
      averageCostPerVehicle,
      costPerKm,
    };
  }

  async costReplaceAnalysis(vehicleId: string, body: any) {
    const { expectedResaleValue, newVehicleCost, projectedMaintenanceNextYear, projectedFuelNextYear, yearsToEvaluate } = body;

    const keepCost =
      (projectedMaintenanceNextYear + projectedFuelNextYear) *
      (yearsToEvaluate || 1);

    const replaceCost = newVehicleCost - expectedResaleValue;

    return {
      keepCost,
      replaceCost,
      recommendation: replaceCost < keepCost ? 'REPLACE' : 'KEEP',
      difference: Math.abs(keepCost - replaceCost),
    };
  }
}