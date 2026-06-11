import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DlqService } from './dlq.service';

@ApiTags('dlq')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dlq')
export class DlqController {
  constructor(private readonly dlqService: DlqService) {}

  @Get()
  @ApiOperation({ summary: 'List permanently failed jobs per channel' })
  list() {
    return this.dlqService.listFailed();
  }

  @Post(':channel/retry-all')
  @ApiOperation({ summary: 'Retry all failed jobs of a channel' })
  retryAll(@Param('channel') channel: string) {
    return this.dlqService.retryAll(channel);
  }

  @Post(':channel/:jobId/retry')
  @ApiOperation({ summary: 'Retry a single failed job' })
  retry(@Param('channel') channel: string, @Param('jobId') jobId: string) {
    return this.dlqService.retry(channel, jobId);
  }

  @Delete(':channel/:jobId')
  @ApiOperation({ summary: 'Discard a failed job (message stays marked failed)' })
  discard(@Param('channel') channel: string, @Param('jobId') jobId: string) {
    return this.dlqService.discard(channel, jobId);
  }
}
