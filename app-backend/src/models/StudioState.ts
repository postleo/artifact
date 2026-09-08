import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

// Generic key/value store for the studio UI's persisted state (production profile
// and the props slate), replacing browser localStorage with the backend database.
export interface StudioStateAttributes {
  key: string;
  value: any;
}

export class StudioState extends Model<StudioStateAttributes> implements StudioStateAttributes {
  declare key: string;
  declare value: any;
}

StudioState.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'StudioState',
    tableName: 'studio_state',
  }
);
