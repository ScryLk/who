import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomCode,
  isValidRoomCode,
  buildRoomInvitePath,
  buildRoomInviteUrl,
  extractRoomCodeFromUrl,
} from './inviteUtils.js';

describe('Room Invite and Code Utilities', () => {
  describe('normalizeRoomCode', () => {
    test('normalizes standard uppercase code', () => {
      assert.equal(normalizeRoomCode('ABCD'), 'ABCD');
    });

    test('normalizes lowercase to uppercase', () => {
      assert.equal(normalizeRoomCode('cdsa'), 'CDSA');
    });

    test('trims surrounding whitespace', () => {
      assert.equal(normalizeRoomCode('  cdsa  '), 'CDSA');
    });

    test('strips leading hash character', () => {
      assert.equal(normalizeRoomCode('#CDSA'), 'CDSA');
      assert.equal(normalizeRoomCode(' #cdsa '), 'CDSA');
    });

    test('extracts room code from full invite URL', () => {
      assert.equal(normalizeRoomCode('https://who.app/?room=CDSA'), 'CDSA');
      assert.equal(normalizeRoomCode('http://localhost:3000/?code=wxyz'), 'WXYZ');
    });

    test('handles empty or malformed inputs', () => {
      assert.equal(normalizeRoomCode(''), '');
      assert.equal(normalizeRoomCode('   '), '');
      assert.equal(normalizeRoomCode('###'), '');
    });
  });

  describe('isValidRoomCode', () => {
    test('accepts valid 4-character alphanumeric codes', () => {
      assert.equal(isValidRoomCode('CDSA'), true);
      assert.equal(isValidRoomCode('K7P2'), true);
      assert.equal(isValidRoomCode('9999'), true);
    });

    test('rejects lowercase, invalid length or symbols', () => {
      assert.equal(isValidRoomCode('cdsa'), false);
      assert.equal(isValidRoomCode('CDS'), false);
      assert.equal(isValidRoomCode('CDSAA'), false);
      assert.equal(isValidRoomCode('#CDS'), false);
      assert.equal(isValidRoomCode('CD-A'), false);
      assert.equal(isValidRoomCode(''), false);
    });
  });

  describe('buildRoomInvitePath', () => {
    test('generates canonical /?room=CODE path', () => {
      assert.equal(buildRoomInvitePath('CDSA'), '/?room=CDSA');
      assert.equal(buildRoomInvitePath('cdsa'), '/?room=CDSA');
      assert.equal(buildRoomInvitePath('#CDSA'), '/?room=CDSA');
      assert.equal(buildRoomInvitePath('  k7p2  '), '/?room=K7P2');
    });
  });

  describe('buildRoomInviteUrl', () => {
    test('builds full URL when origin is provided', () => {
      assert.equal(
        buildRoomInviteUrl('CDSA', 'https://who.app'),
        'https://who.app/?room=CDSA'
      );
      assert.equal(
        buildRoomInviteUrl('k7p2', 'http://localhost:3000'),
        'http://localhost:3000/?room=K7P2'
      );
    });

    test('falls back to path when no origin and no window', () => {
      assert.equal(buildRoomInviteUrl('CDSA'), '/?room=CDSA');
    });
  });

  describe('extractRoomCodeFromUrl', () => {
    test('extracts code from canonical ?room= parameter', () => {
      assert.equal(extractRoomCodeFromUrl('?room=CDSA'), 'CDSA');
      assert.equal(extractRoomCodeFromUrl('https://who.app/?room=cdsa'), 'CDSA');
      assert.equal(extractRoomCodeFromUrl('https://who.app/game?other=1&room=K7P2'), 'K7P2');
    });

    test('extracts code from legacy ?code= parameter', () => {
      assert.equal(extractRoomCodeFromUrl('?code=CDSA'), 'CDSA');
      assert.equal(extractRoomCodeFromUrl('https://who.app/?code=cdsa'), 'CDSA');
    });

    test('returns null for empty or invalid room code in URL', () => {
      assert.equal(extractRoomCodeFromUrl('?room='), null);
      assert.equal(extractRoomCodeFromUrl('?room=ABCDE'), null);
      assert.equal(extractRoomCodeFromUrl('?room=AB'), null);
      assert.equal(extractRoomCodeFromUrl('?room=!!@@'), null);
      assert.equal(extractRoomCodeFromUrl('https://who.app/'), null);
      assert.equal(extractRoomCodeFromUrl(''), null);
    });
  });
});
