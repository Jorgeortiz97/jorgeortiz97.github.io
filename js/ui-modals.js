// ui-modals.js - Modal-related UI functionality

const UIModals = {
    // Reference to the main UI controller (set during init)
    ui: null,
    game: null,

    init(uiController) {
        this.ui = uiController;
        this.game = uiController.game;
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

        const guildOptions = document.getElementById('guild-options');
        guildOptions.innerHTML = '<h3>Causar Motín en:</h3>';

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
                ModalManager.hide('guild-modal');
            });
            guildOptions.appendChild(div);
        });

        ModalManager.show('guild-modal');
    },

    showTreasureSellSelection() {
        const player = this.game.players[0];

        if (player.treasures.length === 0) {
            this.game.log('No tienes tesoros para vender');
            return;
        }

        const guildOptions = document.getElementById('guild-options');
        guildOptions.innerHTML = '<h3>Vender Tesoro 4💰:</h3>';

        player.treasures.forEach((treasure, index) => {
            const div = document.createElement('div');
            div.className = 'guild-option';

            let treasureDesc;
            if (treasure.type === TREASURE_TYPES.WEALTH) {
                treasureDesc = `💰 Tesoro de ${treasure.coinValue} monedas`;
            } else if (treasure.vp === 1) {
                treasureDesc = '⭐ Tesoro de 1 VP';
            } else if (treasure.vp === 2) {
                treasureDesc = '⭐⭐ Tesoro de 2 VP';
            }

            div.innerHTML = `<strong>${treasureDesc}</strong>`;
            div.addEventListener('click', () => {
                if (this.game.sellTreasureArtisan(player, index)) {
                    this.ui.updateGameState();
                }
                ModalManager.hide('guild-modal');
            });
            guildOptions.appendChild(div);
        });

        ModalManager.show('guild-modal');
    },

    showEventModal(event) {
        const modal = document.getElementById('event-modal');
        const card = document.getElementById('event-modal-card');
        const frontCard = card.querySelector('.event-card-front');

        let bgImage = this.ui.getEventBackgroundImage(event);

        if (bgImage) {
            frontCard.style.backgroundImage = `url('${bgImage}')`;
        } else {
            frontCard.style.backgroundImage = `url('resources/other/Event_Back.png')`;
        }

        card.classList.remove('flipped');
        modal.classList.remove('hidden');

        setTimeout(() => {
            card.classList.add('flipped');
        }, 100);

        setTimeout(() => {
            modal.classList.add('hidden');
            card.classList.remove('flipped');
        }, GAME_CONSTANTS.EVENT_MODAL_DURATION);
    },

    showReshuffleAnimation(callback) {
        const modal = document.getElementById('reshuffle-modal');
        const eventDeckStack = document.querySelector('#reshuffle-event-deck .reshuffle-card-stack');
        const discardPileStack = document.querySelector('#reshuffle-discard-pile .reshuffle-card-stack');
        const eventDeckCard = eventDeckStack.querySelector('.event-deck-card');
        const discardPileCard = discardPileStack.querySelector('.discard-pile-card');

        let lastDiscardImage = 'resources/other/Event_Back.png';
        if (this.game && this.game.eventDiscard && this.game.eventDiscard.length > 0) {
            const lastEvent = this.game.eventDiscard[this.game.eventDiscard.length - 1];
            const eventImage = this.ui.getEventBackgroundImage(lastEvent);
            if (eventImage) {
                lastDiscardImage = eventImage;
            }
        }

        eventDeckCard.style.backgroundImage = `url('resources/other/Event_Back.png')`;
        discardPileCard.style.backgroundImage = `url('${lastDiscardImage}')`;

        eventDeckStack.classList.remove('moving', 'shuffling', 'settling');
        discardPileStack.classList.remove('moving', 'shuffling', 'settling');

        modal.classList.remove('hidden');

        setTimeout(() => {
            eventDeckStack.classList.add('moving');
            discardPileStack.classList.add('moving');
        }, 100);

        setTimeout(() => {
            eventDeckStack.classList.remove('moving');
            discardPileStack.classList.remove('moving');
            eventDeckStack.classList.add('shuffling');
            discardPileCard.style.backgroundImage = '';
        }, 2100);

        setTimeout(() => {
            modal.classList.add('hidden');
            eventDeckStack.classList.remove('moving', 'shuffling', 'settling');
            discardPileStack.classList.remove('moving', 'shuffling', 'settling');
            eventDeckCard.style.backgroundImage = '';
            discardPileCard.style.backgroundImage = '';

            if (callback && typeof callback === 'function') {
                callback();
            }
        }, GAME_CONSTANTS.RESHUFFLE_ANIMATION_DURATION);
    },

    showGameOver(winner) {
        const scores = this.game.players
            .map(p => ({ name: p.name, vp: p.getVictoryPoints(this.game, true) }))
            .sort((a, b) => b.vp - a.vp);

        const finalScores = document.getElementById('final-scores');
        finalScores.innerHTML = `
            <h3>🏆 ${winner.name} gana!</h3>
            <div style="margin-top: 20px;">
                ${scores.map((s, i) => `
                    <p style="font-size: 1.1em; margin: 10px 0;">
                        ${i + 1}. ${s.name}: <strong>${s.vp} VP</strong>
                    </p>
                `).join('')}
            </div>
        `;

        ModalManager.show('game-over-modal');
    },

    showCharacterInfoModal(character, playerName) {
        const modal = document.getElementById('character-info-modal');
        const title = document.getElementById('character-info-modal-title');
        const body = document.getElementById('character-info-modal-body');

        if (!modal || !title || !body || !character) return;

        title.style.display = 'none';

        const imagePath = getCharacterImagePath(character.id);
        let contentHTML = '<div class="character-modal-layout">';
        contentHTML += `<div class="character-modal-image-container">`;
        contentHTML += `<img src="${imagePath}" alt="${character.nameES}" class="character-image-modal">`;
        contentHTML += `</div>`;
        contentHTML += `<div class="character-modal-buttons-column">`;
        contentHTML += `<button class="btn-cancel-character-modal" id="close-character-preview-btn">Cerrar</button>`;
        contentHTML += `</div>`;
        contentHTML += '</div>';

        body.innerHTML = contentHTML;

        const closeBtn = body.querySelector('#close-character-preview-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideCharacterInfoModal();
            });
        }

        const modalBackdropHandler = (e) => {
            if (e.target === modal) {
                this.hideCharacterInfoModal();
                modal.removeEventListener('click', modalBackdropHandler);
            }
        };
        modal.addEventListener('click', modalBackdropHandler);

        modal.classList.remove('hidden');
    },

    hideCharacterInfoModal() {
        ModalManager.hide('character-info-modal');
    },

    hideGuildModal() {
        ModalManager.hide('guild-modal');
    },

    hideCharacterModal() {
        ModalManager.hide('character-modal');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIModals };
}
