import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { onRequest } from 'firebase-functions/v2/https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

function createDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: SCOPES,
  });
  return google.drive({ version: 'v3', auth });
}

async function getFolderId(drive) {
  const FOLDER_NAME = 'JCCiMS Web App';
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive'
  });

  if (res.data.files.length > 0) return res.data.files[0].id;

  const createRes = await drive.files.create({
    resource: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });

  return createRes.data.id;
}

async function getFileId(drive, folderId, filename) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name='${filename}' and trashed=false`,
    fields: 'files(id)'
  });
  return res.data.files.length > 0 ? res.data.files[0].id : null;
}

app.get('/inventory', async (req, res) => {
  try {
    const drive = createDriveClient();
    const folderId = await getFolderId(drive);
    let fileId = await getFileId(drive, folderId, 'inventory_items.json');

    if (!fileId) {
      const initialData = {
        version: "1.0.0",
        lastModified: new Date().toISOString(),
        items: []
      };
      const createRes = await drive.files.create({
        resource: {
          name: 'inventory_items.json',
          mimeType: 'application/json',
          parents: [folderId]
        },
        media: {
          mimeType: 'application/json',
          body: Readable.from([JSON.stringify(initialData)])
        },
        fields: 'id'
      });
      fileId = createRes.data.id;
    }

    const result = await drive.files.get({
      fileId,
      alt: 'media'
    });

    res.json(result.data);
  } catch (err) {
    console.error('GET /inventory error:', err);
    res.status(500).send({ error: err.message || 'Unknown error' });
  }
});

app.post('/inventory', async (req, res) => {
  try {
    const drive = createDriveClient();
    const folderId = await getFolderId(drive);
    const fileId = await getFileId(drive, folderId, 'inventory_items.json');

    const fileMetadata = {
      name: 'inventory_items.json',
      mimeType: 'application/json'
    };

    const media = {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(req.body)])
    };

    if (fileId) {
      await drive.files.update({
        fileId,
        media,
        resource: fileMetadata
      });
    } else {
      await drive.files.create({
        resource: {
          ...fileMetadata,
          parents: [folderId]
        },
        media,
        fields: 'id'
      });
    }

    res.status(200).send({ message: 'Inventory saved successfully' });
  } catch (err) {
    console.error('POST /inventory error:', err);
    res.status(500).send({ error: err.message || 'Unknown error' });
  }
});

export const jccStockroomCore = onRequest(app);