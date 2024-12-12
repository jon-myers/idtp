import { MongoClient, ServerApiVersion } from 'mongodb';
// import dotenv from 'dotenv';

// dotenv.config();

async function updateTranscriptions() {
  const username = process.env.USER_NAME;
  const password = process.env.PASSWORD;
  const uri = `mongodb+srv://${username}:${password}@swara.f5cuf.mongodb.net/?retryWrites=true&w=majority`;

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
  });

  try {
    await client.connect();
    const database = client.db('swara'); // Replace with your database name
    const collection = database.collection('transcriptions');

    const updateResult = await collection.updateMany(
      { phraseGrid: ['$phrases'] },
      [
        {
          $set: {
            phraseGrid: { $cond: { if: { $isArray: "$phrases" }, then: ["$phrases"], else: [] } },
            durArrayGrid: { $cond: { if: { $isArray: "$durArray" }, then: ["$durArray"], else: [] } },
            sectionCatGrid: { $cond: { if: { $isArray: "$sectionCategorization" }, then: ["$sectionCategorization"], else: [] } },
            sectionStartsGrid: { $cond: { if: { $isArray: "$sectionStarts" }, then: ["$sectionStarts"], else: [] } }
          }
        }
      ]
    );

    console.log(`${updateResult.matchedCount} documents matched the filter, updated ${updateResult.modifiedCount} documents`);
  } finally {
    await client.close();
  }
}

updateTranscriptions().catch(console.error);