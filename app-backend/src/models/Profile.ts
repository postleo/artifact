import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export interface ProfileAttributes {
  id?: number;
  projectName: string;
  worldLore: string;
  departmentRole: string;
  leadName: string;
}

export class Profile extends Model<ProfileAttributes> implements ProfileAttributes {
  public id!: number;
  public projectName!: string;
  public worldLore!: string;
  public departmentRole!: string;
  public leadName!: string;
}

Profile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Chronicles of Aethelgard',
    },
    worldLore: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Steampunk / Gilded Age of Drift',
    },
    departmentRole: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Lead Prop Master',
    },
    leadName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Isla Venn',
    },
  },
  {
    sequelize,
    modelName: 'Profile',
    tableName: 'profiles',
  }
);
