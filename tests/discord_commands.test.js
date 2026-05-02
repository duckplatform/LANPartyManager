'use strict';

/**
 * Tests unitaires — Service Discord Commandes Slash
 * Vérifie les handlers sans accès BDD réel (injection de mocks).
 */

const { expect } = require('chai');

// ─── Import du service à tester ───────────────────────────────────────────────

const discordCommands = require('../services/discordCommands');

// ─── Constantes Discord ───────────────────────────────────────────────────────

const { InteractionType, InteractionResponseType } = require('discord.js');

// Flags Discord
const EPHEMERAL_FLAG = 64;

// ─────────────────────────────────────────────────────────────────────────────

describe('Discord Commandes Slash', function () {

  // ── verifySignature ────────────────────────────────────────────────────────

  describe('verifySignature()', function () {

    it('doit retourner false si rawBody est absent', function () {
      expect(discordCommands.verifySignature(null, 'sig', 'ts', 'a'.repeat(64))).to.be.false;
    });

    it('doit retourner false si signature est absent', function () {
      const body = Buffer.from('test');
      expect(discordCommands.verifySignature(body, null, 'ts', 'a'.repeat(64))).to.be.false;
    });

    it('doit retourner false si timestamp est absent', function () {
      const body = Buffer.from('test');
      expect(discordCommands.verifySignature(body, 'sig', null, 'a'.repeat(64))).to.be.false;
    });

    it('doit retourner false si publicKeyHex est absent', function () {
      const body = Buffer.from('test');
      expect(discordCommands.verifySignature(body, 'sig', 'ts', null)).to.be.false;
    });

    it('doit retourner false si la clé publique n\'est pas de 32 octets (64 hex chars)', function () {
      const body = Buffer.from('test');
      // Clé trop courte
      expect(discordCommands.verifySignature(body, 'a'.repeat(128), '1234567890', 'a'.repeat(30))).to.be.false;
    });

    it('doit retourner false pour une signature invalide (données bidon)', function () {
      const body      = Buffer.from('{"type":1}');
      const timestamp = '1234567890';
      const sig       = 'a'.repeat(128); // signature bidon
      const pubKey    = 'b'.repeat(64);  // clé bidon mais longueur correcte
      // Doit retourner false (signature vérifiablement incorrecte)
      expect(discordCommands.verifySignature(body, sig, timestamp, pubKey)).to.be.false;
    });

    it('doit vérifier correctement une signature Ed25519 valide', function () {
      const crypto = require('crypto');

      // Générer une paire de clés Ed25519 réelle pour le test
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

      const timestamp = '1700000000';
      const body      = Buffer.from('{"type":1}');
      const message   = Buffer.concat([Buffer.from(timestamp, 'utf-8'), body]);

      // Signer avec la clé privée
      const signature = crypto.sign(null, message, privateKey);

      // Extraire la clé publique en format brut (32 octets)
      const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).slice(12); // enlever le préfixe DER
      const pubKeyHex    = rawPublicKey.toString('hex');

      expect(discordCommands.verifySignature(body, signature.toString('hex'), timestamp, pubKeyHex)).to.be.true;
    });

    it('doit retourner false si la signature ne correspond pas au corps', function () {
      const crypto = require('crypto');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

      const timestamp = '1700000000';
      const body      = Buffer.from('{"type":1}');
      const wrongBody = Buffer.from('{"type":99}');
      const message   = Buffer.concat([Buffer.from(timestamp, 'utf-8'), wrongBody]);

      const signature    = crypto.sign(null, message, privateKey);
      const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).slice(12);
      const pubKeyHex    = rawPublicKey.toString('hex');

      // La signature porte sur wrongBody, pas sur body → invalide
      expect(discordCommands.verifySignature(body, signature.toString('hex'), timestamp, pubKeyHex)).to.be.false;
    });

  });

  // ── handleInteraction — PING ───────────────────────────────────────────────

  describe('handleInteraction() — PING', function () {

    it('doit répondre Pong à un PING Discord', async function () {
      const ping = { type: InteractionType.Ping };
      const result = await discordCommands.handleInteraction(ping);

      expect(result).to.deep.equal({ type: InteractionResponseType.Pong });
    });

  });

  // ── handleInteraction — commande inconnue ──────────────────────────────────

  describe('handleInteraction() — commande inconnue', function () {

    it('doit retourner un message éphémère pour une commande inconnue', async function () {
      const interaction = {
        type: InteractionType.ApplicationCommand,
        data: { name: 'commandeInexistante' },
        member: { user: { id: '123456789012345678' } },
      };
      const result = await discordCommands.handleInteraction(interaction);

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('commandeInexistante');
    });

    it('doit retourner un message pour un type d\'interaction non géré', async function () {
      const interaction = { type: 999 };
      const result = await discordCommands.handleInteraction(interaction);

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
    });

  });

  // ── handleClassement ──────────────────────────────────────────────────────

  describe('handleClassement()', function () {

    let originalFindActive;
    let originalFindByEvent;

    before(function () {
      // Sauvegarder les originaux pour restauration
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      originalFindActive  = Event.findActive;
      originalFindByEvent = EventRanking.findByEvent;
    });

    afterEach(function () {
      // Restaurer les originaux après chaque test
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      Event.findActive        = originalFindActive;
      EventRanking.findByEvent = originalFindByEvent;
    });

    it('doit retourner un message éphémère si aucun événement en cours', async function () {
      const Event = require('../models/Event');
      Event.findActive = async () => null;

      const result = await discordCommands.handleClassement();

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('Aucun événement');
    });

    it('doit retourner un message éphémère si l\'événement est planifié (pas en cours)', async function () {
      const Event = require('../models/Event');
      Event.findActive = async () => ({ id: 1, nom: 'LAN Test', lieu: 'Paris', statut: 'planifie', date_heure: new Date() });

      const result = await discordCommands.handleClassement();

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
    });

    it('doit retourner un embed avec le classement pour un événement en cours', async function () {
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      Event.findActive = async () => ({
        id: 1, nom: 'LAN Printemps', lieu: 'Paris', statut: 'en_cours', date_heure: new Date(),
      });
      EventRanking.findByEvent = async () => [
        { rang: 1, user_id: 1, pseudo: 'Alpha', points: 10, wins: 5 },
        { rang: 2, user_id: 2, pseudo: 'Beta',  points: 7,  wins: 3 },
        { rang: 3, user_id: 3, pseudo: 'Gamma', points: 4,  wins: 2 },
      ];

      process.env.APP_URL = 'https://lan.example.com';
      const result = await discordCommands.handleClassement();

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data).to.not.have.property('flags');
      expect(result.data.embeds).to.be.an('array').with.length(1);

      const embed = result.data.embeds[0];
      expect(embed.title).to.include('LAN Printemps');
      expect(embed.description).to.include('Alpha');
      expect(embed.description).to.include('🥇');
      expect(embed.description).to.include('🥈');
      expect(embed.description).to.include('🥉');
      expect(embed.url).to.equal('https://lan.example.com/events/1');
    });

    it('doit afficher un message si aucun joueur classé', async function () {
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      Event.findActive = async () => ({
        id: 1, nom: 'LAN Test', lieu: 'Paris', statut: 'en_cours', date_heure: new Date(),
      });
      EventRanking.findByEvent = async () => [];

      const result = await discordCommands.handleClassement();

      expect(result.data.embeds[0].description).to.include('Aucun point');
    });

  });

  // ── handlePosition ────────────────────────────────────────────────────────

  describe('handlePosition()', function () {

    let origUserFindByDiscordId;
    let origEventFindActive;
    let origRankingFindByEvent;

    before(function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      origUserFindByDiscordId = User.findByDiscordId;
      origEventFindActive      = Event.findActive;
      origRankingFindByEvent   = EventRanking.findByEvent;
    });

    afterEach(function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      User.findByDiscordId     = origUserFindByDiscordId;
      Event.findActive         = origEventFindActive;
      EventRanking.findByEvent = origRankingFindByEvent;
    });

    it('doit retourner une erreur éphémère si discordUserId absent', async function () {
      const result = await discordCommands.handlePosition(null);

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('identifiant Discord');
    });

    it('doit retourner une erreur éphémère si le compte Discord n\'est pas lié', async function () {
      const User = require('../models/User');
      User.findByDiscordId = async () => null;

      const result = await discordCommands.handlePosition('999999999999999999');

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('pas lié');
    });

    it('doit retourner une erreur éphémère si aucun événement en cours', async function () {
      const User  = require('../models/User');
      const Event = require('../models/Event');

      User.findByDiscordId = async () => ({ id: 1, pseudo: 'Alpha', discord_user_id: '111' });
      Event.findActive     = async () => null;

      const result = await discordCommands.handlePosition('111');

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('Aucun événement');
    });

    it('doit retourner un message si le joueur n\'est pas classé', async function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      User.findByDiscordId     = async () => ({ id: 1, pseudo: 'Alpha', discord_user_id: '111' });
      Event.findActive         = async () => ({ id: 1, nom: 'LAN Test', statut: 'en_cours' });
      EventRanking.findByEvent = async () => []; // aucun classement

      const result = await discordCommands.handlePosition('111');

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('pas encore classé');
    });

    it('doit retourner la position du joueur avec une médaille pour le podium', async function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      User.findByDiscordId     = async () => ({ id: 42, pseudo: 'Alpha', discord_user_id: '111' });
      Event.findActive         = async () => ({ id: 1, nom: 'LAN Printemps', statut: 'en_cours' });
      EventRanking.findByEvent = async () => [
        { rang: 1, user_id: 42, points: 15, wins: 5, battles_played: 6 },
        { rang: 2, user_id: 99, points: 10, wins: 3, battles_played: 4 },
      ];

      const result = await discordCommands.handlePosition('111');

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.content).to.include('Alpha');
      expect(result.data.content).to.include('1e');
      expect(result.data.content).to.include('15');
      expect(result.data.content).to.include('🥇');
    });

  });

  // ── handleStatistiques ────────────────────────────────────────────────────

  describe('handleStatistiques()', function () {

    let origUserFindByDiscordId;
    let origEventFindActive;
    let origRankingFindByEvent;

    before(function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      origUserFindByDiscordId = User.findByDiscordId;
      origEventFindActive      = Event.findActive;
      origRankingFindByEvent   = EventRanking.findByEvent;
    });

    afterEach(function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');
      User.findByDiscordId     = origUserFindByDiscordId;
      Event.findActive         = origEventFindActive;
      EventRanking.findByEvent = origRankingFindByEvent;
    });

    it('doit retourner un embed éphémère avec les statistiques du joueur', async function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      User.findByDiscordId     = async () => ({ id: 42, pseudo: 'Alpha', discord_user_id: '111' });
      Event.findActive         = async () => ({ id: 1, nom: 'LAN Test', statut: 'en_cours' });
      EventRanking.findByEvent = async () => [
        { rang: 2, user_id: 42, points: 8, wins: 4, battles_played: 6 },
      ];

      process.env.APP_URL = 'https://lan.example.com';
      const result = await discordCommands.handleStatistiques('111');

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      expect(result.data.embeds).to.be.an('array').with.length(1);

      const embed = result.data.embeds[0];
      expect(embed.title).to.include('Alpha');

      const fieldNames = embed.fields.map(f => f.name);
      expect(fieldNames).to.include('🏅 Classement');
      expect(fieldNames).to.include('⭐ Points');
      expect(fieldNames).to.include('🏆 Victoires');
      expect(fieldNames).to.include('⚔️ Rencontres jouées');
      expect(fieldNames).to.include('📈 Ratio victoires');

      const ratioField = embed.fields.find(f => f.name === '📈 Ratio victoires');
      expect(ratioField.value).to.equal('67%'); // 4/6 ≈ 67%
    });

    it('doit afficher un message si le joueur n\'a pas participé', async function () {
      const User         = require('../models/User');
      const Event        = require('../models/Event');
      const EventRanking = require('../models/EventRanking');

      User.findByDiscordId     = async () => ({ id: 42, pseudo: 'Alpha', discord_user_id: '111' });
      Event.findActive         = async () => ({ id: 1, nom: 'LAN Test', statut: 'en_cours' });
      EventRanking.findByEvent = async () => [];

      const result = await discordCommands.handleStatistiques('111');

      expect(result.data.flags).to.equal(EPHEMERAL_FLAG);
      const embed = result.data.embeds[0];
      expect(embed.description).to.include("pas encore participé");
    });

  });

  // ── handleEvenement ───────────────────────────────────────────────────────

  describe('handleEvenement()', function () {

    let origEventFindActive;
    let origCountByEvent;
    let origIsRegistrationOpen;

    before(function () {
      const Event             = require('../models/Event');
      const EventRegistration = require('../models/EventRegistration');
      origEventFindActive      = Event.findActive;
      origCountByEvent         = EventRegistration.countByEvent;
      origIsRegistrationOpen   = EventRegistration.isRegistrationOpen;
    });

    afterEach(function () {
      const Event             = require('../models/Event');
      const EventRegistration = require('../models/EventRegistration');
      Event.findActive                 = origEventFindActive;
      EventRegistration.countByEvent   = origCountByEvent;
      EventRegistration.isRegistrationOpen = origIsRegistrationOpen;
    });

    it('doit retourner un message si aucun événement n\'est prévu', async function () {
      const Event = require('../models/Event');
      Event.findActive = async () => null;

      const result = await discordCommands.handleEvenement();

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.content).to.include('Aucun événement');
      expect(result.data).to.not.have.property('embeds');
    });

    it('doit afficher un embed pour un événement en cours', async function () {
      const Event             = require('../models/Event');
      const EventRegistration = require('../models/EventRegistration');

      Event.findActive                = async () => ({
        id: 5, nom: 'LAN Été', lieu: 'Lyon', statut: 'en_cours',
        date_heure: new Date('2026-07-10T14:00:00Z'),
      });
      EventRegistration.countByEvent   = async () => 32;
      EventRegistration.isRegistrationOpen = () => false;

      process.env.APP_URL = 'https://lan.example.com';
      const result = await discordCommands.handleEvenement();

      expect(result.type).to.equal(InteractionResponseType.ChannelMessageWithSource);
      expect(result.data.content).to.include('LAN Été');
      expect(result.data.embeds).to.be.an('array').with.length(1);

      const embed = result.data.embeds[0];
      expect(embed.color).to.equal(0x57F287); // Vert pour événement en cours
      expect(embed.title).to.include('LAN Été');
      expect(embed.url).to.equal('https://lan.example.com/events/5');

      const inscritField = embed.fields.find(f => f.name === '👥 Inscrits');
      expect(inscritField.value).to.include('32');
    });

    it('doit inclure un lien d\'inscription pour un événement planifié ouvert', async function () {
      const Event             = require('../models/Event');
      const EventRegistration = require('../models/EventRegistration');

      Event.findActive                = async () => ({
        id: 6, nom: 'LAN Automne', lieu: 'Bordeaux', statut: 'planifie',
        date_heure: new Date(Date.now() + 7 * 24 * 3600 * 1000), // dans 7 jours
      });
      EventRegistration.countByEvent   = async () => 10;
      EventRegistration.isRegistrationOpen = () => true;

      process.env.APP_URL = 'https://lan.example.com';
      const result = await discordCommands.handleEvenement();

      expect(result.data.content).to.include('inscriptions sont ouvertes');
      const embed = result.data.embeds[0];
      expect(embed.color).to.equal(0x5865F2);

      const inscriptionField = embed.fields.find(f => f.name === '📝 Inscription');
      expect(inscriptionField).to.exist;
      expect(inscriptionField.value).to.include('https://lan.example.com/events/6');
    });

    it('ne doit pas inclure de lien d\'inscription si les inscriptions sont fermées', async function () {
      const Event             = require('../models/Event');
      const EventRegistration = require('../models/EventRegistration');

      Event.findActive                = async () => ({
        id: 7, nom: 'LAN Hiver', lieu: 'Paris', statut: 'planifie',
        date_heure: new Date(Date.now() + 3600 * 1000), // dans 1h (inscriptions fermées)
      });
      EventRegistration.countByEvent   = async () => 50;
      EventRegistration.isRegistrationOpen = () => false;

      const result = await discordCommands.handleEvenement();

      const embed = result.data.embeds[0];
      const inscriptionField = embed.fields.find(f => f.name === '📝 Inscription');
      expect(inscriptionField).to.not.exist;
    });

  });

  // ── SLASH_COMMANDS ────────────────────────────────────────────────────────

  describe('SLASH_COMMANDS', function () {

    it('doit exposer les 4 commandes attendues', function () {
      const names = discordCommands.SLASH_COMMANDS.map(c => c.name);
      expect(names).to.include('classement');
      expect(names).to.include('position');
      expect(names).to.include('statistiques');
      expect(names).to.include('evenement');
    });

    it('toutes les commandes doivent avoir un nom et une description', function () {
      for (const cmd of discordCommands.SLASH_COMMANDS) {
        expect(cmd.name).to.be.a('string').that.is.not.empty;
        expect(cmd.description).to.be.a('string').that.is.not.empty;
      }
    });

  });

});
