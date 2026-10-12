/**
 * Backend des réponses pour la page « Nouvel An à Copenhague » (version GitHub Pages).
 *
 * Installation (5 min) :
 * 1. Crée un Google Sheet vide (ex. « Copenhague — réponses »).
 * 2. Menu Extensions > Apps Script. Remplace le contenu de Code.gs par ce fichier. Enregistre.
 * 3. Déployer > Nouveau déploiement > type « Application Web ».
 *      Exécuter en tant que : Moi
 *      Qui a accès : Tout le monde
 *    Autorise l'accès quand Google le demande.
 * 4. Copie l'URL qui finit par /exec et colle-la dans SHEET_URL en haut du <script> de index.html.
 *
 * Après une modification de ce script : Déployer > Gérer les déploiements > modifier > Nouvelle version
 * (sinon l'URL /exec continue de servir l'ancienne version).
 *
 * La colonne « json » est la source de vérité lue par la page. Les autres colonnes sont là pour toi.
 */

const SHEET_NAME = 'Réponses';
const MAX_ROWS = 200;
const HEADERS = ['id', 'mis à jour', 'json', 'Prénom', 'Vient', 'Arrivée', 'Départ', 'Dates souples',
  'Transport', 'Rôle voiture', 'Places libres', 'Carburant', 'Itinéraire', 'Aéroport', 'Bagage',
  'Logement', 'Chambre', 'Avec', 'Budget max', 'Mot'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Neutralise les valeurs qu'une feuille interpréterait comme formule.
function cell_(v) {
  const s = String(v == null ? '' : v).slice(0, 600);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doGet() {
  const values = sheet_().getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || '');
    if (!id) continue;
    try {
      const data = JSON.parse(values[i][2]);
      data.id = id;
      rows.push(data);
    } catch (e) { /* ligne illisible : ignorée */ }
  }
  return json_({ ok: true, rows: rows });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const id = String(body.id || '');
    if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) return json_({ ok: false, error: 'id invalide' });

    const sh = sheet_();
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
    const idx = ids.indexOf(id); // 0-based among data rows

    if (body.delete) {
      if (idx >= 0) sh.deleteRow(idx + 2);
      return json_({ ok: true });
    }

    const d = body.data || {};
    const json = JSON.stringify(d);
    if (json.length > 5000) return json_({ ok: false, error: 'réponse trop longue' });

    const row = [id, new Date(), json,
      d.prenom, d.presence, d.arrivee, d.depart, d.flexible,
      d.transport, d.role, d.places, d.carburant, d.itineraire, d.aeroport, d.bagage,
      d.logement, d.chambre, d.avec, d.budget, d.commentaire].map((v, i) => (i === 1 ? v : cell_(v)));
    row[2] = json; // keep raw JSON intact

    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    } else {
      if (ids.length >= MAX_ROWS) return json_({ ok: false, error: 'trop de réponses' });
      sh.appendRow(row);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
