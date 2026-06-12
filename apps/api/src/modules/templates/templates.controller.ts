import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
import { scopeFromRequest } from '../auth/tenant-scope';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@ApiTags('templates')
@ApiSecurity('api-key')
@ApiBearerAuth()
@UseGuards(ApiKeyOrJwtGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a template ({{variable}} placeholders in body/subject)' })
  create(@Body() dto: CreateTemplateDto, @Request() req: any) {
    return this.templatesService.create(dto, scopeFromRequest(req));
  }

  @Get()
  @ApiOperation({ summary: 'List templates (API keys see their tenant only)' })
  findAll(@Request() req: any) {
    return this.templatesService.findAll(scopeFromRequest(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.findOne(id, scopeFromRequest(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Request() req: any) {
    return this.templatesService.update(id, dto, scopeFromRequest(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, scopeFromRequest(req));
  }
}
