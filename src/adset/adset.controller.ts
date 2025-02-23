import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { AdsetService } from './adset.service';
import { Node } from './node.schema';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { CreateNodeDto } from './dto/create.node.dto';
import { NodeDto } from './dto/node.dto';
import { AdsetFilterDto } from './dto/adset.filter.dto';
import { UpdateNodeDto } from './dto/update.node.dto';

@ApiTags('Adset')
@Controller('adset')
export class AdsetController {
  constructor(private readonly adsetService: AdsetService) {}

  @ApiOperation({ summary: 'Create a new node' })
  @ApiResponse({
    status: 201,
    description: 'The node has been successfully created.',
    type: Node,
  })
  @Post()
  async createNode(@Body() node: CreateNodeDto): Promise<NodeDto> {
    return this.adsetService.createNode(node);
  }

  @Get('nodes')
  @ApiOperation({ summary: 'Get all nodes' })
  @ApiResponse({
    status: 200,
    description: 'All nodes have been successfully retrieved.',
    type: [NodeDto],
  })
  async getNodes(): Promise<NodeDto[]> {
    return this.adsetService.getNodes();
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get a node by ID' })
  @ApiResponse({
    status: 200,
    description: 'The node has been successfully retrieved.',
    type: Node,
  })
  async getNode(@Param('id') id: string): Promise<Node | null> {
    return this.adsetService.getPopulatedNode(id);
  }

  @Put('nodes/:id')
  @ApiOperation({ summary: 'Update a node by ID' })
  @ApiResponse({
    status: 200,
    description: 'The node has been successfully updated.',
  })
  async updateNode(@Param('id') id: string, @Body() node: UpdateNodeDto) {
    return this.adsetService.updateNode(id, node);
  }

  @Delete('nodes/:id')
  @ApiOperation({ summary: 'Delete a node by ID' })
  @ApiResponse({
    status: 200,
    description: 'The node has been successfully deleted.',
  })
  async deleteNode(@Param('id') id: string) {
    return this.adsetService.deleteNode(id);
  }

  @Get('generate')
  @ApiOperation({ summary: 'Generate an adset' })
  @ApiResponse({
    status: 200,
    description: 'The adset has been successfully generated.',
  })
  @ApiQuery({ type: AdsetFilterDto })
  async generateAdSet(@Query() filter: AdsetFilterDto) {
    return this.adsetService.generateAdSet(filter);
  }
}
