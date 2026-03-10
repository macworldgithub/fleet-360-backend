import { IsString, IsEnum, IsNumber, IsOptional, IsArray } from 'class-validator';
import { PlanTier } from './plan.schema';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsEnum(PlanTier)
  tier: PlanTier;

  @IsNumber()
  monthlyPrice: number;

  @IsNumber()
  yearlyPrice: number;

  @IsOptional()
  @IsNumber()
  vehicleLimit?: number;

  @IsOptional()
  @IsNumber()
  driverLimit?: number;

  @IsOptional()
  @IsArray()
  features?: string[];
}