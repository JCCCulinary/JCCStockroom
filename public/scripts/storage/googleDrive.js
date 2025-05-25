
export const GoogleDrive = {
  folderName: "JCC Stockroom-Data",
  folderId: null,

  CLIENT_ID: '413630001365-gcbm8eue668febgspk290kuvovlts54i.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBPkwUagSxKxSrdH08WtZSogU5xOokG250',
  SCOPES: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
  tokenClient: null,
  accessToken: null,

  init: async function () {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.accounts || !google.accounts.oauth2) {
        return reject("Google Identity Services library not loaded");
      }

      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("Token error:", tokenResponse);
            reject(tokenResponse.error);
          } else {
            this.accessToken = tokenResponse.access_token;
            try {
              await this.loadDriveAPI();
              await this.ensureFolder();
              resolve(true);
            } catch (e) {
              reject(e);
            }
          }
        }
      });

      // Trigger user consent
      this.tokenClient.requestAccessToken();
    });
  },

  loadDriveAPI: async function () {
    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: this.API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
          });
          resolve();
        } catch (err) {
          console.error("Drive API load failed:", err);
          reject(err);
        }
      });
    });
  },

  ensureFolder: async function () {
    const response = await gapi.client.drive.files.list({
      q: "name='" + this.folderName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)"
    });

    if (response.result.files && response.result.files.length > 0) {
      this.folderId = response.result.files[0].id;
    } else {
      const createRes = await gapi.client.drive.files.create({
        resource: {
          name: this.folderName,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      this.folderId = createRes.result.id;
    }
  },

  loadFile: async function (filename) {
    const listRes = await gapi.client.drive.files.list({
      q: `'${this.folderId}' in parents and name='${filename}' and trashed=false`,
      fields: 'files(id, name)'
    });

    if (!listRes.result.files.length) return null;

    const fileId = listRes.result.files[0].id;
    const getRes = await gapi.client.drive.files.get({
      fileId,
      alt: 'media'
    });

    return getRes.result;
  },

  saveFile: async function (filename, data) {
    const listRes = await gapi.client.drive.files.list({
      q: `'${this.folderId}' in parents and name='${filename}' and trashed=false`,
      fields: 'files(id, name)'
    });

    const fileContent = JSON.stringify(data);
    const blob = new Blob([fileContent], { type: 'application/json' });

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      parents: [this.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const method = listRes.result.files.length ? 'PATCH' : 'POST';
    const fileId = listRes.result.files[0]?.id || '';

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files${method === 'PATCH' ? '/' + fileId : '?uploadType=multipart'}`, {
      method,
      headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
      body: form
    });

    return res.ok;
  }
};
