import { Module } from '@nestjs/common';
import { AdsetService } from './adset.service';
import { AdsetController } from './adset.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Node, NodeSchema } from './node.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Node.name, schema: NodeSchema }]),
    RedisModule,
  ],
  controllers: [AdsetController],
  providers: [AdsetService],
  exports: [AdsetService],
})
export class AdsetModule {}
