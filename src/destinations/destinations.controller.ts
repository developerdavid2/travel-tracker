import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DestinationsService } from './destinations.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@Controller('destinations')
@UseGuards(JwtAuthGuard)
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  //   "/destinations"
  @Post()
  async createDestination(
    @Request() req,
    @Body() createDestinationDto: CreateDestinationDto,
  ) {
    const createdDestination = await this.destinationsService.create(
      req.user.userId,
      createDestinationDto,
    );

    return {
      success: true,
      data: createdDestination,
      message: 'Created successfully',
    };
  }

  @Get('me')
  async getDestinations(@Request() req) {
    const destinations = await this.destinationsService.findUserDestinations(
      req.user.userId,
    );

    return {
      success: true,
      data: destinations,
      message: 'Destinations fetched successfully',
    };
  }

  @Get(':destinationId')
  async getDestination(
    @Request() req,
    @Param('destinationId') destinationId: string,
  ) {
    const destination = await this.destinationsService.findUserDestinationById(
      req.user.userId,
      +destinationId,
    );

    return {
      success: true,
      data: destination,
      message: 'Destination fetched successfully',
    };
  }

  @Patch(':destinationId')
  async updateUserDestination(
    @Request() req,
    @Param('destinationId') destinationId: string,
    @Body() updateDestinationDto: UpdateDestinationDto,
  ) {
    const updatedDestination =
      await this.destinationsService.upateUserDestinationById(
        req.user.userId,
        +destinationId,
        updateDestinationDto,
      );

    return {
      success: true,
      message: 'Updated succesffully',
      data: updatedDestination,
    };
  }

  @Delete(':destinationId')
  async deleteUserDestination(
    @Request() req,
    @Param('destinationId') destinationId: string,
  ) {
    const deletedDestination =
      await this.destinationsService.deleteUserDestinationById(
        req.user.userId,
        +destinationId,
      );

    return {
      success: true,
      message: 'Deleted succesffully',
      data: deletedDestination,
    };
  }
}
