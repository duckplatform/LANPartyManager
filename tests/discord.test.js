'use strict';

/**
 * Tests unitaires - Service Discord
 * Vérifie les notifications sans appel réseau réel (injection de fakeRest)
 */

const { expect } = require('chai');

// ── Chargement du service (sans stub discord.js) ──────────────────────────

const discord = require('../services/discord');

// ─────────────────────────────────────────────────────────────────────────

describe('Discord Service', function () {

  let postCalls;
  let fakeRest;

  beforeEach(function () {
    // Configure l'environnement Discord
    process.env.DISCORD_BOT_TOKEN      = 'fake-test-token';
    process.env.DISCORD_CHANNEL_EVENTS = '111111111111111111';
    process.env.DISCORD_CHANNEL_NEWS   = '222222222222222222';
    process.env.APP_URL                = 'https://lan.example.com';

    // Crée un faux client REST qui enregistre les appels
    postCalls = [];
    fakeRest = {
      post: async (route, options) => {
        postCalls.push({ route, options });
        return {};
      },
    };

    // Injecte le faux client
    discord._setRestClient(fakeRest);
  });

  afterEach(function () {
    // Réinitialise le client injecté
    discord._setRestClient(null);
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_CHANNEL_EVENTS;
    delete process.env.DISCORD_CHANNEL_NEWS;
    delete process.env.APP_URL;
  });

  // ── notifyEventCreated ─────────────────────────────────────────────────

  describe('notifyEventCreated()', function () {

    it('doit appeler REST.post avec un embed et le canal événements', async function () {
      const event = {
        id:         1,
        nom:        'LAN Printemps 2026',
        date_heure: new Date('2026-04-10T18:00:00Z'),
        lieu:       'Salle des fêtes',
        statut:     'planifie',
      };

      await discord.notifyEventCreated(event);

      expect(postCalls).to.have.length(1);
      const { route, options } = postCalls[0];
      expect(route).to.include('111111111111111111');
      expect(options.body.embeds).to.be.an('array').with.length(1);
      expect(options.body.embeds[0].title).to.include('LAN Printemps 2026');
      expect(options.body.embeds[0].color).to.equal(0x5865F2);
      expect(options.body.content).to.include('@everyone');
    });

    it('doit inclure le lieu et la date dans les champs de l\'embed', async function () {
      const event = {
        id:         2,
        nom:        'LAN Été 2026',
        date_heure: new Date('2026-07-15T14:00:00Z'),
        lieu:       'Centre culturel',
        statut:     'planifie',
      };

      await discord.notifyEventCreated(event);

      const embed = postCalls[0].options.body.embeds[0];
      const fieldNames = embed.fields.map(f => f.name);
      expect(fieldNames).to.include('📍 Lieu');
      expect(fieldNames).to.include('🕐 Date');
      const lieuField = embed.fields.find(f => f.name === '📍 Lieu');
      expect(lieuField.value).to.equal('Centre culturel');
    });

    it('doit inclure l\'URL de l\'application dans l\'embed', async function () {
      const event = {
        id:         3,
        nom:        'LAN Test',
        date_heure: new Date(),
        lieu:       'Paris',
        statut:     'planifie',
      };

      await discord.notifyEventCreated(event);

      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.url).to.equal('https://lan.example.com/');
    });

  });

  // ── notifyEventStarted ─────────────────────────────────────────────────

  describe('notifyEventStarted()', function () {

    it('doit appeler REST.post avec un embed vert (en cours)', async function () {
      const event = {
        id:         1,
        nom:        'LAN Printemps 2026',
        date_heure: new Date('2026-04-10T18:00:00Z'),
        lieu:       'Salle des fêtes',
        statut:     'en_cours',
      };

      await discord.notifyEventStarted(event);

      expect(postCalls).to.have.length(1);
      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.color).to.equal(0x57F287);
      expect(embed.title).to.include('LAN Printemps 2026');
      expect(postCalls[0].options.body.content).to.include('LAN Printemps 2026');
    });

    it('doit envoyer sur le canal événements', async function () {
      await discord.notifyEventStarted({
        id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris',
      });

      expect(postCalls[0].route).to.include('111111111111111111');
    });

    it('doit prioriser le canal Discord dédié de l\'événement', async function () {
      await discord.notifyEventStarted({
        id: 1,
        nom: 'LAN Test',
        date_heure: new Date(),
        lieu: 'Paris',
        discord_channel_id: '333333333333333333',
      });

      expect(postCalls[0].route).to.include('333333333333333333');
    });

  });

  // ── notifyEventEnded ───────────────────────────────────────────────────

  describe('notifyEventEnded()', function () {

    it('doit appeler REST.post avec un embed rouge (terminé)', async function () {
      const event = {
        id:         1,
        nom:        'LAN Printemps 2026',
        date_heure: new Date('2026-04-10T18:00:00Z'),
        lieu:       'Salle des fêtes',
        statut:     'termine',
      };

      await discord.notifyEventEnded(event);

      expect(postCalls).to.have.length(1);
      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.color).to.equal(0xED4245);
      expect(embed.title).to.include('LAN Printemps 2026');
    });

    it('doit envoyer sur le canal événements', async function () {
      await discord.notifyEventEnded({
        id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris',
      });

      expect(postCalls[0].route).to.include('111111111111111111');
    });

    it('doit prioriser le canal Discord dédié de l\'événement', async function () {
      await discord.notifyEventEnded({
        id: 1,
        nom: 'LAN Test',
        date_heure: new Date(),
        lieu: 'Paris',
        discord_channel_id: '333333333333333333',
      });

      expect(postCalls[0].route).to.include('333333333333333333');
    });

  });

  // ── notifyNewsPublished ────────────────────────────────────────────────

  describe('notifyNewsPublished()', function () {

    it('doit appeler REST.post avec un embed jaune sur le canal news', async function () {
      const announcement = {
        id:      5,
        titre:   'Ouverture des inscriptions LAN 2026',
        contenu: 'Les inscriptions sont maintenant ouvertes pour la LAN 2026.',
      };

      await discord.notifyNewsPublished(announcement);

      expect(postCalls).to.have.length(1);
      const { route, options } = postCalls[0];
      expect(route).to.include('222222222222222222');
      const embed = options.body.embeds[0];
      expect(embed.color).to.equal(0xFEE75C);
      expect(embed.title).to.include('Ouverture des inscriptions LAN 2026');
    });

    it('doit inclure le lien vers l\'article dans l\'embed', async function () {
      const announcement = {
        id:      5,
        titre:   'Ouverture des inscriptions LAN 2026',
        contenu: 'Contenu de test',
      };

      await discord.notifyNewsPublished(announcement);

      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.url).to.equal('https://lan.example.com/news/5');
      expect(embed.description).to.include('https://lan.example.com/news/5');
    });

    it('doit tronquer le contenu long à 300 caractères max', async function () {
      const announcement = {
        id:      6,
        titre:   'Long article',
        contenu: 'A'.repeat(500),
      };

      await discord.notifyNewsPublished(announcement);

      const embed = postCalls[0].options.body.embeds[0];
      // Le résumé est tronqué à 297 caractères + '…' = 298 caractères
      const summary = embed.description.split('\n\n')[0];
      expect(summary.length).to.equal(298);
      expect(summary.endsWith('…')).to.be.true;
    });

    it('doit supprimer les balises Markdown du résumé', async function () {
      const announcement = {
        id:      7,
        titre:   'Article Markdown',
        contenu: '# Titre\n**gras** _italique_ [lien](https://example.com)',
      };

      await discord.notifyNewsPublished(announcement);

      const embed = postCalls[0].options.body.embeds[0];
      const summary = embed.description.split('\n\n')[0];
      // Les symboles Markdown sont supprimés
      expect(summary).to.not.include('**');
      expect(summary).to.not.include('_');
      // Les liens [texte](url) sont convertis en texte brut
      expect(summary).to.include('lien');
      expect(summary).to.not.include('https://example.com');
      // Le texte des emphases est conservé
      expect(summary).to.include('italique');
    });

    it('doit utiliser un résumé par défaut si le contenu est vide', async function () {
      const announcement = {
        id:      8,
        titre:   'Article vide',
        contenu: '',
      };

      await discord.notifyNewsPublished(announcement);

      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.description).to.include('Pas de résumé disponible');
    });

  });

  // ── Notifications rencontres ───────────────────────────────────────────

  describe('Notifications battles', function () {

    const battleFixture = {
      id: 42,
      event_id: 9,
      game_nom: 'Street Fighter 6',
      game_console: 'PS5',
      room_nom: 'Neo Tokyo',
      statut: 'planifie',
      notes: 'BO3',
      score: '2-1',
      players: [
        { user_id: 1, pseudo: 'AlphaDiscord', equipe: 1, est_gagnant: 1 },
        { user_id: 2, pseudo: 'BravoDiscord', equipe: 2, est_gagnant: 0 },
      ],
    };

    it('doit envoyer les notifications battle sur le canal Discord de l\'événement', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '333333333333333333' };

      await discord.notifyBattleCreated({ event, battle: battleFixture });

      expect(postCalls).to.have.length(1);
      expect(postCalls[0].route).to.include('333333333333333333');
      expect(postCalls[0].options.body.embeds[0].title).to.include('Rencontre #42');
    });

    it('doit fallback sur DISCORD_CHANNEL_EVENTS si le canal de l\'événement est absent', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '' };

      await discord.notifyBattleStarted({ event, battle: battleFixture });

      expect(postCalls).to.have.length(1);
      expect(postCalls[0].route).to.include('111111111111111111');
    });

    it('doit inclure les participants dans les notifications de rencontre', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '333333333333333333' };

      await discord.notifyBattleInstallation({ event, battle: battleFixture });

      const embed = postCalls[0].options.body.embeds[0];
      const participants = embed.fields.find(f => f.name === 'Participants');
      expect(participants).to.exist;
      expect(participants.value).to.include('Equipe 1: @AlphaDiscord');
      expect(participants.value).to.include('Equipe 2: @BravoDiscord');
    });

    it('doit notifier la transition file_attente vers planifie', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '333333333333333333' };
      const plannedBattle = { ...battleFixture, statut: 'planifie' };

      await discord.notifyBattlePlanned({ event, battle: plannedBattle });

      const embed = postCalls[0].options.body.embeds[0];
      expect(embed.title).to.include('planifiee');
      expect(embed.description).to.include('file d\'attente');
    });

    it('doit inclure score et gagnants sur la notification de fin', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '333333333333333333' };

      await discord.notifyBattleEnded({ event, battle: battleFixture });

      const embed = postCalls[0].options.body.embeds[0];
      const scoreField = embed.fields.find(f => f.name === 'Score');
      const winnersField = embed.fields.find(f => f.name === 'Gagnant(s)');
      expect(scoreField.value).to.equal('2-1');
      expect(winnersField.value).to.include('AlphaDiscord');
    });

    it('doit reconnaitre un gagnant quand est_gagnant remonte en Buffer MySQL', async function () {
      const event = { id: 9, nom: 'LAN Test', discord_channel_id: '333333333333333333' };
      const mysqlTypedBattle = {
        ...battleFixture,
        players: [
          { user_id: 1, pseudo: 'AlphaDiscord', equipe: 1, est_gagnant: Buffer.from([1]) },
          { user_id: 2, pseudo: 'BravoDiscord', equipe: 2, est_gagnant: Buffer.from([0]) },
        ],
      };

      await discord.notifyBattleEnded({ event, battle: mysqlTypedBattle });

      const embed = postCalls[0].options.body.embeds[0];
      const winnersField = embed.fields.find(f => f.name === 'Gagnant(s)');
      expect(winnersField.value).to.include('AlphaDiscord');
      expect(winnersField.value).to.not.include('BravoDiscord');
    });

  });

  // ── Comportement sans fakeRest injecté ────────────────────────────────

  describe('Sans client REST configuré', function () {

    it('ne doit pas lancer d\'erreur si le client REST est null', async function () {
      discord._setRestClient(null);
      // Sans token non plus
      delete process.env.DISCORD_BOT_TOKEN;

      // Ne doit pas rejeter
      await discord.notifyEventCreated({
        id: 99, nom: 'Test', date_heure: new Date(), lieu: 'Paris', statut: 'planifie',
      });

      expect(postCalls).to.have.length(0);
    });

    it('ne doit pas lancer d\'erreur si le canal n\'est pas configuré', async function () {
      delete process.env.DISCORD_CHANNEL_EVENTS;

      // Le client est injecté mais le canal est vide
      await discord.notifyEventCreated({
        id: 99, nom: 'Test', date_heure: new Date(), lieu: 'Paris', statut: 'planifie',
      });

      // Aucun appel réseau
      expect(postCalls).to.have.length(0);
    });

  });

  // ── Gestion des erreurs REST ───────────────────────────────────────────

  describe('Gestion des erreurs Discord', function () {

    it('ne doit pas propager une erreur REST vers l\'appelant', async function () {
      fakeRest.post = async () => { throw new Error('Discord API error'); };
      discord._setRestClient(fakeRest);

      // Ne doit pas rejeter
      await discord.notifyEventCreated({
        id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris', statut: 'planifie',
      });
    });

  });

  // ── discord_notifications_enabled ─────────────────────────────────────

  describe('discord_notifications_enabled par événement', function () {

    it('ne doit pas envoyer de notification si discord_notifications_enabled = 0', async function () {
      const event = {
        id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris', statut: 'planifie',
        discord_channel_id: '111111111111111111',
        discord_notifications_enabled: 0,
      };
      await discord.notifyEventCreated(event);
      expect(postCalls).to.have.length(0);
    });

    it('ne doit pas envoyer de notification si discord_notifications_enabled = false', async function () {
      const event = {
        id: 2, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris',
        discord_channel_id: '111111111111111111',
        discord_notifications_enabled: false,
      };
      await discord.notifyEventStarted(event);
      expect(postCalls).to.have.length(0);
    });

    it('doit envoyer si discord_notifications_enabled = 1', async function () {
      const event = {
        id: 3, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris',
        discord_channel_id: '111111111111111111',
        discord_notifications_enabled: 1,
      };
      await discord.notifyEventStarted(event);
      expect(postCalls).to.have.length(1);
    });

    it('doit envoyer si discord_notifications_enabled est absent (par défaut activé)', async function () {
      const event = {
        id: 4, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris',
        discord_channel_id: '111111111111111111',
        // discord_notifications_enabled absent
      };
      await discord.notifyEventEnded(event);
      expect(postCalls).to.have.length(1);
    });

    it('ne doit pas envoyer la notification battle si discord_notifications_enabled = 0', async function () {
      const event = {
        id: 5, nom: 'LAN Test',
        discord_channel_id: '111111111111111111',
        discord_notifications_enabled: 0,
      };
      const battle = {
        id: 10, event_id: 5, statut: 'planifie',
        game_nom: 'SF6', game_console: 'PS5', room_nom: 'Salle A',
        players: [],
      };
      await discord.notifyBattleCreated({ event, battle });
      expect(postCalls).to.have.length(0);
    });

  });

});
