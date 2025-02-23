import { NodeDto } from './node.dto';
import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
export class CreateNodeDto extends PickType(NodeDto, [
  'name',
  'conditions',
  'probability',
]) {
  @ApiPropertyOptional({ description: 'The parent of the node' })
  @IsString()
  @IsOptional()
  parentId: string;
}
