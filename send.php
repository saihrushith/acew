<?php
/*
 * AARVIKO form handler.
 * Every form on the site posts here. The details are emailed to the team, and a plain-text copy is
 * kept in aarviko-form-log.txt (one folder above public_html, so it cannot be opened from the web).
 */
declare(strict_types=1);

const TO_EMAIL   = 'suma@aarviko.com';
const FROM_EMAIL = 'no-reply@aarviko.com';   // an address on your own domain, so the mail is not treated as spam
const MAX_FILE   = 5 * 1024 * 1024;          // resume size limit: 5 MB
const MAX_VALUE  = 5000;                     // longest text a single field may hold

function finish(bool $ok, string $message, int $code = 200, ?string $next = null): void
{
    if ($ok && $next !== null) {
        header('Location: ' . $next, true, 303);
        exit;
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $ok, 'message' => $message]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    finish(false, 'Method not allowed', 405);
}

// the form can arrive as JSON (small forms) or as multipart (forms with a resume)
$data = $_POST;
$type = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($type, 'application/json') !== false) {
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($decoded)) {
        finish(false, 'Bad request', 400);
    }
    $data = $decoded;
}

// where to send the visitor afterwards (classic form posts only): our own site, nothing else
$next = null;
if (isset($data['_next']) && is_string($data['_next'])) {
    $candidate = trim($data['_next']);
    if ($candidate !== '' && $candidate[0] === '/' && substr($candidate, 0, 2) !== '//' && strpos($candidate, "\n") === false && strpos($candidate, "\r") === false) {
        $next = $candidate;
    }
}

// the hidden "website" field is for bots: if it is filled, pretend it worked and send nothing
foreach (['website', '_honey'] as $trap) {
    if (!empty($data[$trap])) {
        finish(true, 'Thank you', 200, $next);
    }
}

$subject = 'AARVIKO website enquiry';
if (isset($data['_subject']) && is_string($data['_subject'])) {
    $clean = trim((string) preg_replace('/[\r\n]+/', ' ', $data['_subject']));
    if ($clean !== '') {
        $subject = substr($clean, 0, 150);
    }
}

$internal = ['_subject', '_next', '_template', '_captcha', '_honey', 'website'];
$fields = [];
$replyTo = null;
foreach ($data as $key => $value) {
    if (!is_string($key) || in_array($key, $internal, true) || !is_scalar($value)) {
        continue;
    }
    $label = trim((string) preg_replace('/[^A-Za-z0-9 _\-\.\/()&]/', '', $key));
    $text = trim((string) $value);
    if ($label === '' || $text === '') {
        continue;
    }
    $text = substr($text, 0, MAX_VALUE);
    $fields[$label] = $text;
    if ($replyTo === null && stripos($label, 'mail') !== false && filter_var($text, FILTER_VALIDATE_EMAIL)) {
        $replyTo = $text;
    }
}
if (count($fields) < 2) {
    finish(false, 'Please fill in the form.', 400);
}

// optional resume
$attachment = null;
if (!empty($_FILES['attachment']) && is_array($_FILES['attachment']) && ($_FILES['attachment']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['attachment'];
    if (($file['error'] ?? 1) !== UPLOAD_ERR_OK || !is_uploaded_file((string) $file['tmp_name'])) {
        finish(false, 'The resume could not be uploaded. Please try a smaller file.', 400);
    }
    if ((int) $file['size'] > MAX_FILE) {
        finish(false, 'Please upload a resume smaller than 5 MB.', 400);
    }
    $ext = strtolower((string) pathinfo((string) $file['name'], PATHINFO_EXTENSION));
    $content = (string) file_get_contents((string) $file['tmp_name']);
    $head = substr($content, 0, 8);
    $isPdf = $ext === 'pdf' && strncmp($head, '%PDF', 4) === 0;
    $isDocx = $ext === 'docx' && strncmp($head, 'PK', 2) === 0;
    $isDoc = $ext === 'doc' && strncmp($head, "\xD0\xCF\x11\xE0", 4) === 0;
    if (!($isPdf || $isDocx || $isDoc)) {
        finish(false, 'Please upload your resume as a PDF, DOC or DOCX file.', 400);
    }
    $mimes = ['pdf' => 'application/pdf', 'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    $safeName = (string) preg_replace('/[^A-Za-z0-9._-]/', '_', basename((string) $file['name']));
    $attachment = ['name' => substr($safeName, 0, 100), 'mime' => $mimes[$ext], 'data' => $content];
}

// build the email
$rows = '';
foreach ($fields as $label => $text) {
    $rows .= '<tr><td style="padding:8px 12px;border:1px solid #dde3ee;background:#f3f6fb;font-weight:bold;vertical-align:top">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</td><td style="padding:8px 12px;border:1px solid #dde3ee">'
        . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . '</td></tr>';
}
$html = '<html><body style="font-family:Arial,sans-serif;color:#0b1b33"><h2 style="color:#21409a">'
    . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . '</h2><table style="border-collapse:collapse;font-size:15px">' . $rows . '</table>'
    . '<p style="color:#667;font-size:12px">Sent from the AARVIKO website.</p></body></html>';

$headers = [
    'From: AARVIKO Website <' . FROM_EMAIL . '>',
    'MIME-Version: 1.0',
    'X-Mailer: AARVIKO-form',
];
if ($replyTo !== null) {
    $headers[] = 'Reply-To: ' . $replyTo;
}
if ($attachment !== null) {
    $boundary = 'aarviko' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $body = '--' . $boundary . "\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html)) . "\r\n"
        . '--' . $boundary . "\r\n"
        . 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . "\"\r\nContent-Transfer-Encoding: base64\r\n"
        . 'Content-Disposition: attachment; filename="' . $attachment['name'] . "\"\r\n\r\n"
        . chunk_split(base64_encode($attachment['data'])) . "\r\n"
        . '--' . $boundary . '--';
} else {
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $body = chunk_split(base64_encode($html));
}
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

// keep a text copy first, so nothing is lost even if the mail server is slow
$copy = '[' . date('Y-m-d H:i:s') . '] ' . $subject . "\n";
foreach ($fields as $label => $text) {
    $copy .= '  ' . $label . ': ' . str_replace(["\r", "\n"], ' ', $text) . "\n";
}
if ($attachment !== null) {
    $copy .= '  (resume attached to the email: ' . $attachment['name'] . ")\n";
}
@file_put_contents(dirname(__DIR__) . '/aarviko-form-log.txt', $copy . "\n", FILE_APPEND | LOCK_EX);

$sent = @mail(TO_EMAIL, $encodedSubject, $body, implode("\r\n", $headers), '-f' . FROM_EMAIL);
if (!$sent) {
    error_log('AARVIKO form: mail() failed for "' . $subject . '"');
    finish(false, 'We could not send your message right now. Please call or WhatsApp +91 95022 90703.', 500);
}
finish(true, 'Thank you', 200, $next);
