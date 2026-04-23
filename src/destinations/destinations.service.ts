import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
// Creating new destination
// Fetching all destination
// Delete, update -> problem -> auth user
@Injectable()
export class DestinationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createDestinationDto: CreateDestinationDto) {
    return this.prisma.destination.create({
      data: {
        ...createDestinationDto,
        travelDate: new Date(createDestinationDto.travelDate),
        userId,
      },
    });
  }

  async findUserDestinations(userId: number) {
    const userDestinations = await this.prisma.user.findMany({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        destinations: true,
      },
    });

    if (!userDestinations || userDestinations.length === 0) {
      throw new NotFoundException(`UserDestinations not found`);
    }

    return userDestinations;
  }

  async findUserDestinationById(userId: number, destinationId: number) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        id: destinationId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!destination) {
      throw new NotFoundException(
        `Current user destination not found with this destinationId: ${destinationId}`,
      );
    }
    return destination;
  }

  async upateUserDestinationById(
    userId: number,
    destinationId: number,
    updateDestinationDto: UpdateDestinationDto,
  ) {
    const userDestination = await this.findUserDestinationById(
      userId,
      destinationId,
    );

    return this.prisma.destination.update({
      where: { id: userDestination.id },
      data: {
        ...updateDestinationDto,
        travelDate: updateDestinationDto.travelDate
          ? new Date(updateDestinationDto.travelDate)
          : undefined,
      },
    });
  }

  async deleteUserDestinationById(userId: number, destinationId: number) {
    const userDestination = await this.findUserDestinationById(
      userId,
      destinationId,
    );

    return this.prisma.destination.delete({
      where: { id: userDestination.id, userId },
    });
  }
}
