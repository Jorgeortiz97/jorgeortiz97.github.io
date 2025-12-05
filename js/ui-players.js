// ui-players.js - Player display functionality

const UIPlayers = {
    ui: null,
    game: null,

    init(uiController) {
        this.ui = uiController;
        this.game = uiController.game;
    },

    formatAIPlayerVP(player) {
        const visibleVP = player.getVictoryPoints(this.game, false);
        const hasTreasures = player.getTreasureCount() > 0;

        if (hasTreasures) {
            return `${visibleVP} + ? VP`;
        } else {
            return `${visibleVP} VP`;
        }
    },

    renderInlineTreasureDetails(player) {
        const detailsContainer = document.getElementById('human-treasure-details');
        if (!detailsContainer) return;

        if (player.treasures.length === 0) {
            detailsContainer.innerHTML = '';
            return;
        }

        const treasuresByType = {
            'WEALTH': 0,
            '1VP': 0,
            '2VP': 0
        };

        player.treasures.forEach(treasure => {
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                treasuresByType['WEALTH']++;
            } else if (treasure.type === TREASURE_TYPES.COMMON) {
                treasuresByType['1VP']++;
            } else if (treasure.type === TREASURE_TYPES.RARE) {
                treasuresByType['2VP']++;
            }
        });

        let html = '';
        if (treasuresByType['WEALTH'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de riqueza">(💰×${treasuresByType['WEALTH']})</span>`;
        }
        if (treasuresByType['1VP'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de 1 VP">(1VP×${treasuresByType['1VP']})</span>`;
        }
        if (treasuresByType['2VP'] > 0) {
            html += `<span class="treasure-item" title="Tesoros de 2 VP">(2VP×${treasuresByType['2VP']})</span>`;
        }

        detailsContainer.innerHTML = html;
    },

    renderHumanTreasureBreakdown(player) {
        const breakdownContainer = document.getElementById('human-treasures-detail');
        if (!breakdownContainer) return;

        if (player.treasures.length === 0) {
            breakdownContainer.innerHTML = '';
            return;
        }

        const treasureCounts = {
            '1VP': 0,
            '2VP': 0,
            '3coins': 0,
            '4coins': 0
        };

        player.treasures.forEach(treasure => {
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                if (treasure.coinValue === 3) {
                    treasureCounts['3coins']++;
                } else if (treasure.coinValue === 4) {
                    treasureCounts['4coins']++;
                }
            } else if (treasure.type === TREASURE_TYPES.COMMON) {
                treasureCounts['1VP']++;
            } else if (treasure.type === TREASURE_TYPES.RARE) {
                treasureCounts['2VP']++;
            }
        });

        let html = '<div class="treasure-breakdown-inline">';

        if (treasureCounts['1VP'] > 0) {
            html += `<div class="resource-item treasure-breakdown-item">
                <img src="resources/other/Treasure_1VP.png" class="resource-icon-small" alt="1VP" title="Tesoros de 1 VP">
                <span class="resource-count-small">×${treasureCounts['1VP']}</span>
            </div>`;
        }

        if (treasureCounts['2VP'] > 0) {
            html += `<div class="resource-item treasure-breakdown-item">
                <img src="resources/other/Treasure_2VP.png" class="resource-icon-small" alt="2VP" title="Tesoros de 2 VP">
                <span class="resource-count-small">×${treasureCounts['2VP']}</span>
            </div>`;
        }

        if (treasureCounts['3coins'] > 0) {
            const index3 = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 3);
            html += `<div class="resource-item treasure-breakdown-item treasure-item-with-sell">
                <img src="resources/other/Wealth_3coins.png" class="resource-icon-small" alt="3 Coins" title="Riquezas de 3 monedas">
                <span class="resource-count-small">×${treasureCounts['3coins']}</span>
                <button class="sell-treasure-btn" data-treasure-index="${index3}">Vender</button>
            </div>`;
        }

        if (treasureCounts['4coins'] > 0) {
            const index4 = player.treasures.findIndex(t => t.type === TREASURE_TYPES.WEALTH && t.coinValue === 4);
            html += `<div class="resource-item treasure-breakdown-item treasure-item-with-sell">
                <img src="resources/other/Wealth_4coins.png" class="resource-icon-small" alt="4 Coins" title="Riquezas de 4 monedas">
                <span class="resource-count-small">×${treasureCounts['4coins']}</span>
                <button class="sell-treasure-btn" data-treasure-index="${index4}">Vender</button>
            </div>`;
        }

        html += '</div>';
        breakdownContainer.innerHTML = html;

        const sellButtons = breakdownContainer.querySelectorAll('.sell-treasure-btn');
        sellButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.treasureIndex);
                this.handleSellTreasure(player, index);
            });
        });
    },

    handleSellTreasure(player, treasureIndex) {
        const treasure = player.treasures[treasureIndex];
        if (!treasure || treasure.type !== TREASURE_TYPES.WEALTH) {
            this.game.log('Solo puedes vender tesoros de monedas');
            return;
        }

        const coinsGained = treasure.coinValue;
        player.removeTreasure(treasureIndex);
        player.addCoins(coinsGained);

        this.game.updateDiscovererEmblem();
        this.game.log(`Vendes un tesoro por ${coinsGained} monedas`, 'action');
        this.ui.updateGameState();
        this.game.checkVictory();
    },

    updateActivePlayerHighlight(elements) {
        elements.playerHuman?.classList.remove('active-player');
        elements.aiPlayer1?.classList.remove('active-player');
        elements.aiPlayer2?.classList.remove('active-player');

        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        if (currentPlayer) {
            if (currentPlayer.id === 0) {
                elements.playerHuman?.classList.add('active-player');
            } else if (currentPlayer.id === 1) {
                elements.aiPlayer1?.classList.add('active-player');
            } else if (currentPlayer.id === 2) {
                elements.aiPlayer2?.classList.add('active-player');
            }
        }
    },

    updateResourceCounts(zone, player) {
        const coinCount = zone.querySelector('.coin-count');
        const vpCount = zone.querySelector('.vp-count');
        const landsCount = zone.querySelector('.lands-count');
        const cultivatedCount = zone.querySelector('.cultivated-count');
        const innsCount = zone.querySelector('.inns-count');
        const destroyedCount = zone.querySelector('.destroyed-count');
        const treasuresCount = zone.querySelector('.treasures-count');

        if (coinCount) coinCount.textContent = player.coins;
        if (vpCount) vpCount.textContent = player.getVictoryPoints(this.game, true);
        if (landsCount) landsCount.textContent = player.getUncultivatedLandsCount();

        if (cultivatedCount) {
            cultivatedCount.textContent = player.getCultivatedLandsCount();
            cultivatedCount.classList.toggle('resource-count-green', player.getCultivatedLandsCount() > 0);
        }

        if (innsCount) innsCount.textContent = player.getActiveInnsCount();

        if (destroyedCount) {
            destroyedCount.textContent = player.getDestroyedInnsCount();
            destroyedCount.classList.toggle('resource-count-red', player.getDestroyedInnsCount() > 0);
        }

        if (treasuresCount) treasuresCount.textContent = player.getTreasureCount();
    },

    updateEmblemDisplay(zone, player) {
        const emblemBadge = zone.querySelector('.emblem-badge');
        if (emblemBadge) {
            emblemBadge.style.display = player.hasDiscovererEmblem ? 'inline' : 'none';
        }

        const emblemIcon = zone.querySelector('.discoverer-emblem');
        if (emblemIcon) {
            emblemIcon.style.display = player.hasDiscovererEmblem ? 'inline' : 'none';
        }
    },

    updateCharacterAbilityButtons(player) {
        const humanSection = document.getElementById('human-column');
        if (!humanSection || !player.character) return;

        const buttons = {
            mutiny: humanSection.querySelector('[data-action="cause-mutiny"]'),
            buyTreasure: humanSection.querySelector('[data-action="buy-treasure"]'),
            sellTreasure: humanSection.querySelector('[data-action="sell-treasure-artisan"]')
        };

        const isMercenary = player.isMercenary();
        const isArtisan = player.isArtisan();

        if (buttons.mutiny) {
            buttons.mutiny.classList.toggle('character-ability-hidden', !isMercenary);
            buttons.mutiny.style.display = isMercenary ? 'flex' : 'none';
        }

        if (buttons.buyTreasure) {
            buttons.buyTreasure.classList.toggle('character-ability-hidden', !isArtisan);
            buttons.buyTreasure.style.display = isArtisan ? 'flex' : 'none';
        }

        if (buttons.sellTreasure) {
            buttons.sellTreasure.classList.toggle('character-ability-hidden', !isArtisan);
            buttons.sellTreasure.style.display = isArtisan ? 'flex' : 'none';
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIPlayers };
}
