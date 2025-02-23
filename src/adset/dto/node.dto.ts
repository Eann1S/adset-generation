import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class NodeDto {
  @ApiProperty({ description: 'The name of the node' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The conditions of the node',
    default: {},
  })
  conditions: Record<string, string>;

  @ApiProperty({ description: 'The probability of the node' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  probability: number;

  @ApiProperty({ description: 'The parent of the node' })
  parent: NodeDto;

  @ApiProperty({ description: 'The children of the node' })
  children: NodeDto[];
}
