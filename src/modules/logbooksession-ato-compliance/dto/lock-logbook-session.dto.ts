import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockLogbookSessionDto {
  @ApiProperty({
    example: '69942fa3c94c1a92c87d5e53',
    description: 'User ObjectId who is locking the session',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
