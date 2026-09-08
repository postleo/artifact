import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export interface PropAttributes {
  id: string;
  name: string;
  description: string;
  status: string;
  brief: any;
  options: any;
  selection: any;
  final_assets: any;
  cost: any;
  flags: any;
  job_id?: string | null;
}

export class Prop extends Model<PropAttributes> implements PropAttributes {
  declare id: string;
  declare name: string;
  declare description: string;
  declare status: string;
  declare brief: any;
  declare options: any;
  declare selection: any;
  declare final_assets: any;
  declare cost: any;
  declare flags: any;
  declare job_id: string | null;
}

Prop.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'generating_options',
    },
    brief: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    selection: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    final_assets: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    cost: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { nb2_images: 0, nbpro_images: 0, est_usd: 0.0 },
    },
    flags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { trademark_risk: 'none', moderation: 'clean', budget_exceeded: false },
    },
    job_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Prop',
    tableName: 'props',
  }
);
