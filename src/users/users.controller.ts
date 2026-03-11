import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ======= Profile =======
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logged-in user profile' })
  async getProfile(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update logged-in user profile' })
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateById(req.user.userId, dto);
  }

  // ======= Admin User Management =======
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard) // add AdminGuard if role-based
  @ApiOperation({ summary: 'Get all users (admin)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new user (admin)' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  async findOne(@Param('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch(':userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user by ID (admin)' })
  async update(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateById(userId, dto);
  }

  @Delete(':userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete user by ID (admin)' })
  async remove(@Param('userId') userId: string) {
    await this.usersService.deleteById(userId);
    return { message: 'User deleted successfully' };
  }
}
