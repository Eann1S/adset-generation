import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Node, NodeDocument } from './node.schema';
import { CreateNodeDto } from './dto/create.node.dto';
import { AdsetFilterDto } from './dto/adset.filter.dto';
import { UpdateNodeDto } from './dto/update.node.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AdsetService {
  private readonly cacheKeys = {
    node: (id: string) => `node-${id}`,
    adset: (filter: AdsetFilterDto, nodeId?: string) =>
      `adset-${nodeId || 'root'}-${JSON.stringify(filter)}`,
  };
  private readonly adsetTTL = parseInt(process.env.ADSET_TTL || '15');
  private readonly nodeTTL = parseInt(process.env.NODE_TTL || '300');

  constructor(
    @InjectModel(Node.name) private nodeModel: Model<Node>,
    private redisService: RedisService,
  ) {}

  async createNode(node: CreateNodeDto) {
    const { name, conditions, probability, parentId } = node;
    if (!parentId) {
      await this.validateThatRootIsUnique();
    }
    const parent = await this.getNode(parentId);
    const createdNode = new this.nodeModel({
      name,
      conditions,
      probability,
      parent,
    });
    await createdNode.save();
    await this.clearRelatedCache();
    return this.getNode(createdNode._id.toString());
  }

  private async validateThatRootIsUnique() {
    const root = await this.nodeModel.findOne({ parent: null });
    if (root) {
      throw new BadRequestException('Root node already exists');
    }
  }

  async getNodes(): Promise<NodeDocument[]> {
    return this.nodeModel.find();
  }

  async getNode(id: string): Promise<NodeDocument> {
    const node = await this.nodeModel.findById(id);
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    await this.redisService.set(
      this.cacheKeys.node(node._id.toString()),
      node,
      this.nodeTTL,
    );
    return node;
  }

  async getPopulatedNode(id: string): Promise<NodeDocument> {
    const node = await this.nodeModel.findById(id).populate('children');
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    await this.redisService.set(
      this.cacheKeys.node(node._id.toString()),
      node,
      this.nodeTTL,
    );
    return node;
  }

  async getRootNode(): Promise<NodeDocument> {
    const node = await this.nodeModel
      .findOne({ parent: null })
      .populate('children');
    if (!node) {
      throw new NotFoundException('Root node not found');
    }
    await this.redisService.set(
      this.cacheKeys.node(node._id.toString()),
      node,
      this.nodeTTL,
    );
    return node;
  }

  async updateNode(id: string, node: UpdateNodeDto) {
    const updatedNode = await this.nodeModel.findByIdAndUpdate(id, node, {
      new: true,
    });
    if (!updatedNode) {
      throw new NotFoundException('Node not found');
    }
    await this.clearRelatedCache();
    await this.redisService.set(
      this.cacheKeys.node(updatedNode._id.toString()),
      updatedNode,
      this.nodeTTL,
    );
    return updatedNode;
  }

  async deleteNode(id: string) {
    const node = await this.nodeModel.findById(id).populate('parent');
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    if (node.parent) {
      const idx = node.parent.children.findIndex(
        (child) => child._id.toString() === id,
      );
      if (idx !== -1) {
        node.parent.children.splice(idx, 1);
        await node.parent.save();
        await this.redisService.set(
          this.cacheKeys.node(node.parent._id.toString()),
          node.parent,
          this.nodeTTL,
        );
      }
    }
    await node.deleteOne();
    await this.clearRelatedCache();
    await this.redisService.del(this.cacheKeys.node(id));
  }

  async generateAdSet(
    filter: AdsetFilterDto,
    nodeId?: string,
  ): Promise<NodeDocument[]> {
    const key = this.getCacheKey(filter, nodeId);
    const cachedNodes = await this.getCachedNodes(key);
    if (cachedNodes) {
      return cachedNodes;
    }

    let node: NodeDocument;
    if (!nodeId) {
      node = await this.getRootNode();
    } else {
      node = await this.getPopulatedNode(nodeId);
    }

    if (!node.children || node.children.length === 0) {
      await this.cacheNodes(key, [node]);
      return [node];
    }

    const filteredChildren = this.filterChildren(node, filter);
    const child = this.getRandomChild(filteredChildren);
    const adset = await this.generateAdSet(filter, child._id.toString());

    const result = [node, ...adset];
    await this.cacheNodes(key, result);
    return result;
  }

  private filterChildren(
    parent: NodeDocument,
    filter: AdsetFilterDto,
  ): NodeDocument[] {
    return parent.children.filter((child) =>
      Object.entries(child.conditions || {}).every(([key, value]) =>
        filter[key] ? filter[key] === value : true,
      ),
    );
  }

  private getRandomChild(children: NodeDocument[]) {
    const totalProbability = this.getTotalProbability(children);
    const random = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    for (const child of children) {
      cumulativeProbability += child.probability;
      if (random <= cumulativeProbability) {
        return child;
      }
    }
    return children[children.length - 1];
  }

  private getTotalProbability(children: NodeDocument[]) {
    const total = children.reduce((acc, child) => acc + child.probability, 0);
    return total;
  }

  private getCacheKey(filter: AdsetFilterDto, nodeId?: string): string {
    filter = Object.fromEntries(
      Object.entries(filter).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
    );
    return this.cacheKeys.adset(filter, nodeId);
  }

  private async getCachedNodes(key: string): Promise<NodeDocument[] | null> {
    const cachedNodes = await this.redisService.get<NodeDocument[]>(key);
    return cachedNodes;
  }

  private async cacheNodes(key: string, nodes: NodeDocument[]): Promise<void> {
    await this.redisService.set(key, nodes, this.adsetTTL);
  }

  private async clearRelatedCache(): Promise<void> {
    const keys = await this.redisService.scan('adset-*');
    await Promise.all(keys.map((key) => this.redisService.del(key)));
  }
}
