var FILE_NAME = 'notion-widgets-data.json';

function file_() {
  var it = DriveApp.getFilesByName(FILE_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFile(FILE_NAME, '{}');
}
function load_() {
  try { return JSON.parse(file_().getBlob().getDataAsString() || '{}'); } catch (e) { return {}; }
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return json_(load_()); }
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var s = load_(), inc = JSON.parse(e.postData.contents);
    for (var k in inc) {
      if (!s[k] || inc[k].ts > s[k].ts) s[k] = inc[k];
    }
    file_().setContent(JSON.stringify(s));
    return json_(s);
  } finally { lock.releaseLock(); }
}
