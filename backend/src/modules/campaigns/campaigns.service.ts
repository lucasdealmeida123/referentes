import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Campaign } from "./campaign.entity";
import { CreateCampaignDto } from "./dto/create-campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>
  ) {}

  create(dto: CreateCampaignDto) {
    const campaign = this.campaignRepository.create({
      ...dto,
      fechaEleccion: dto.fechaEleccion ?? null
    });
    return this.campaignRepository.save(campaign);
  }

  findAll() {
    return this.campaignRepository.find({
      where: [{ estado: "activa" }, { estado: "planificacion" }],
      order: { anio: "DESC", nombre: "ASC" }
    });
  }
}
