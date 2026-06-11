import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
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
  create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all templates' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
