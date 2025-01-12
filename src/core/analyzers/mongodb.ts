import { MongoClient, Db, Document, IndexDescription } from 'mongodb';
import type { SchemaStats } from '../types';

export interface MongoCollection {
  collection: string;
  fields: string[];
  types: Record<string, string[]>;
  indexes: IndexDescription[];
  sampleData: Document;
}

export interface MongoDocument extends Document {
  [key: string]: unknown;
}

export class MongoAnalyzer {
  private client: MongoClient;

  constructor(connectionString: string, timeout: number) {
    this.client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: timeout,
    });
  }

  public async analyze(): Promise<{ schema: string; stats: SchemaStats }> {
    try {
      await this.client.connect();
      const db = this.client.db();
      const collections = await this.extractCollections(db);
      const stats = this.calculateStats(collections);

      return {
        schema: JSON.stringify(collections, null, 0),
        stats,
      };
    } finally {
      await this.client.close();
    }
  }

  private async extractCollections(db: Db): Promise<MongoCollection[]> {
    const collections = await db.listCollections().toArray();
    const schemas: MongoCollection[] = [];

    for (const collection of collections) {
      const sample = await db
        .collection<MongoDocument>(collection.name)
        .aggregate<MongoDocument>([{ $sample: { size: 5 } }])
        .toArray();

      if (sample.length > 0) {
        const sampleDoc = sample[0];
        schemas.push({
          collection: collection.name,
          fields: Array.from(new Set(sample.flatMap((doc: MongoDocument) => Object.keys(doc)))),
          types: Object.fromEntries(
            Object.keys(sampleDoc).map((key) => [
              key,
              Array.from(
                new Set(sample.map((doc: MongoDocument) => typeof doc[key]).filter(Boolean))
              ),
            ])
          ),
          indexes: await db.collection(collection.name).indexes(),
          sampleData: sampleDoc,
        });
      }
    }

    return schemas;
  }

  private calculateStats(collections: MongoCollection[]): SchemaStats {
    const totalFields = collections.reduce((acc, coll) => acc + coll.fields.length, 0);
    const totalIndexes = collections.reduce((acc, coll) => acc + coll.indexes.length, 0);

    return {
      totalSize: JSON.stringify(collections).length,
      objectCount: collections.length,
      details: {
        collections: collections.length,
        fields: totalFields,
        indexes: totalIndexes,
      },
    };
  }
}
