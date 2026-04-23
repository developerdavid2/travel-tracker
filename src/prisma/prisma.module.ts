import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

//makes the module as globally scoped
@Global()
@Module({
  //register prisma service in this module
  providers: [PrismaService],

  //making sure thsi prisma service is available to other modules that will import into their own module
  exports: [PrismaService],
})
export class PrismaModule {}
