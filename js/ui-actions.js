// ui-actions.js - Action handling functionality

const UIActions = {
    ui: null,
    game: null,

    init(uiController) {
        this.ui = uiController;
        this.game = uiController.game;
    },

    handleActionClick(e) {
        const action = e.target.dataset.action;
        const player = this.game.players[this.game.currentPlayerIndex];

        if (player.isAI || this.game.phase !== 'investment') {
            return;
        }

        switch (action) {
            case 'invest-guild':
                this.ui.showGuildSelection('invest');
                break;
            case 'invest-expedition':
                this.game.investInExpedition(player);
                this.ui.updateGameState();
                break;
            case 'buy-land':
                this.game.buyLand(player);
                this.ui.updateGameState();
                break;
            case 'cultivate-land':
                this.selectLandToCultivate(player);
                break;
            case 'build-inn':
                this.selectLandForInn(player);
                break;
            case 'repair-inn':
                this.selectInnToRepair(player);
                break;
            case 'cause-mutiny':
                this.showMutinyGuildSelection();
                break;
            case 'buy-treasure':
                this.game.buyTreasureArtisan(player);
                this.ui.updateGameState();
                break;
            case 'sell-treasure-artisan':
                this.showTreasureSellSelection();
                break;
            case 'end-turn':
                this.game.endTurn();
                this.ui.updateGameState();
                break;
        }
    },

    selectLandToCultivate(player) {
        const uncultivatedIndices = player.getUncultivatedLandIndices();

        if (uncultivatedIndices.length === 0) {
            this.game.log('No tienes tierras sin cultivar');
            return;
        }

        this.game.cultivateLand(player, uncultivatedIndices[0]);
        this.ui.updateGameState();
    },

    selectLandForInn(player) {
        if (player.lands.length === 0) {
            this.game.log('No tienes tierras');
            return;
        }

        this.game.buildInn(player, 0);
        this.ui.updateGameState();
    },

    selectInnToRepair(player) {
        const destroyedIndices = player.getDestroyedInnIndices();

        if (destroyedIndices.length === 0) {
            this.game.log('No tienes posadas destruidas');
            return;
        }

        this.game.repairInn(player, destroyedIndices[0]);
        this.ui.updateGameState();
    },

    showMutinyGuildSelection() {
        const player = this.game.players[0];

        const guildsWithInvestments = this.game.activeGuilds.filter(guild => {
            return guild.investments.some(inv => inv.playerId === player.id);
        });

        if (guildsWithInvestments.length === 0) {
            this.game.log('No has invertido en ningún gremio');
            return;
        }

        this.ui.elements.guildOptions.innerHTML = '<h3>Causar Motín en:</h3>';

        guildsWithInvestments.forEach(guild => {
            const div = document.createElement('div');
            div.className = 'guild-option';
            div.innerHTML = `
                <strong>${guild.name} (${guild.number})</strong><br>
                Tus inversiones: ${guild.investments.filter(inv => inv.playerId === player.id).length}
            `;
            div.addEventListener('click', () => {
                if (this.game.causeMutiny(player, guild.number)) {
                    this.ui.updateGameState();
                }
                this.ui.hideGuildModal();
            });

            this.ui.elements.guildOptions.appendChild(div);
        });

        ModalManager.show('guild-modal');
    },

    showTreasureSellSelection() {
        const player = this.game.players[0];

        if (player.treasures.length === 0) {
            this.game.log('No tienes tesoros para vender');
            return;
        }

        this.ui.elements.guildOptions.innerHTML = '<h3>Vender Tesoro 4:</h3>';

        player.treasures.forEach((treasure, index) => {
            const div = document.createElement('div');
            div.className = 'guild-option';

            let treasureDesc;
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                treasureDesc = `Tesoro de ${treasure.coinValue} monedas`;
            } else if (treasure.vp === 1) {
                treasureDesc = 'Tesoro de 1 VP';
            } else if (treasure.vp === 2) {
                treasureDesc = 'Tesoro de 2 VP';
            }

            div.innerHTML = `<strong>${treasureDesc}</strong>`;
            div.addEventListener('click', () => {
                if (this.game.sellTreasureArtisan(player, index)) {
                    this.ui.updateGameState();
                }
                this.ui.hideGuildModal();
            });

            this.ui.elements.guildOptions.appendChild(div);
        });

        ModalManager.show('guild-modal');
    },

    updateActionButtons() {
        const player = this.game.players[this.game.currentPlayerIndex];
        const isHumanTurn = !player.isAI && this.game.phase === 'investment';

        const investGuildBtn = document.querySelector('[data-action="invest-guild"]');
        const maxInvestments = player.hasAdditionalInvestment() ? 3 : 2;
        const canInvestInGuild = player.investmentsThisTurn < maxInvestments &&
                                 player.guildInvestmentsThisTurn < 2 &&
                                 (!player.investedInGuildThisTurn || player.hasAdditionalInvestment());
        const canInvestGuildFree = player.hasFirstInvestmentFree() &&
                                   player.reserve >= 1 &&
                                   player.character.firstInvestmentFree.some(guildNum => {
                                       const guild = this.game.activeGuilds.find(g => g.number === guildNum);
                                       return guild && guild.investments.filter(inv => inv.playerId === player.id).length === 0;
                                   });
        const hasCoinsForGuild = canInvestGuildFree || player.coins >= GAME_CONSTANTS.INVESTMENT_COST;
        investGuildBtn.disabled = !isHumanTurn || !hasCoinsForGuild || !canInvestInGuild;

        const investExpeditionBtn = document.querySelector('[data-action="invest-expedition"]');
        const canInvestExpeditionFree = player.hasFreeExpeditionInvestment() &&
                                         this.game.expedition.investments.length === 0;
        const hasCoinsForExpedition = canInvestExpeditionFree || player.coins >= GAME_CONSTANTS.INVESTMENT_COST;
        const canInvestInExpedition = player.investmentsThisTurn < maxInvestments &&
                                      player.expeditionInvestmentsThisTurn < 2 &&
                                      (!player.investedInExpeditionThisTurn || player.hasAdditionalInvestment());
        investExpeditionBtn.disabled = !isHumanTurn || !hasCoinsForExpedition ||
            this.game.expedition.investments.length >= GAME_CONSTANTS.MAX_GUILD_INVESTMENTS || !canInvestInExpedition;

        const buyLandBtn = document.querySelector('[data-action="buy-land"]');
        buyLandBtn.disabled = !isHumanTurn || player.coins < GAME_CONSTANTS.INVESTMENT_COST;

        const cultivateLandBtn = document.querySelector('[data-action="cultivate-land"]');
        cultivateLandBtn.disabled = !isHumanTurn || player.coins < 1 ||
            player.getUncultivatedLandIndices().length === 0;

        const innCost = player.getInnCost();
        const buildInnBtn = document.querySelector('[data-action="build-inn"]');
        buildInnBtn.disabled = !isHumanTurn || player.coins < innCost || player.lands.length === 0;
        buildInnBtn.innerHTML = `<span class="action-text">Construir Posada (${innCost})</span>`;

        const repairInnBtn = document.querySelector('[data-action="repair-inn"]');
        repairInnBtn.disabled = !isHumanTurn || player.coins < 1 ||
            player.getDestroyedInnIndices().length === 0;

        const endTurnBtn = document.querySelector('[data-action="end-turn"]');
        endTurnBtn.disabled = !isHumanTurn;

        const mutinyBtn = document.querySelector('[data-action="cause-mutiny"]');
        if (mutinyBtn && mutinyBtn.style.display !== 'none') {
            mutinyBtn.disabled = !isHumanTurn || player.coins < 1 ||
                (player.usedMutinyAbility || false) ||
                !this.game.activeGuilds.some(g => g.investments.some(inv => inv.playerId === player.id));
        }

        const buyTreasureBtn = document.querySelector('[data-action="buy-treasure"]');
        if (buyTreasureBtn && buyTreasureBtn.style.display !== 'none') {
            buyTreasureBtn.disabled = !isHumanTurn || player.coins < GAME_CONSTANTS.ARTISAN_TREASURE_COST || player.usedArtisanTreasureAbility;
            buyTreasureBtn.style.opacity = buyTreasureBtn.disabled ? '0.5' : '1';
        }

        const sellTreasureBtn = document.querySelector('[data-action="sell-treasure-artisan"]');
        if (sellTreasureBtn && sellTreasureBtn.style.display !== 'none') {
            sellTreasureBtn.disabled = !isHumanTurn || player.usedArtisanTreasureAbility || player.treasures.length === 0;
            sellTreasureBtn.style.opacity = sellTreasureBtn.disabled ? '0.5' : '1';
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIActions };
}
