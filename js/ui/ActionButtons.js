// ActionButtons - Utility class for creating interactive buttons

class ActionButtons {
    static createButton(scene, x, y, text, options = {}) {
        const {
            width = 150,
            height = 40,
            bgColor = 0x8b3545,
            hoverColor = 0xa04555,
            strokeColor = 0xe6c870,
            textColor = '#ffffff',
            fontSize = '16px',
            onClick = null
        } = options;

        const container = scene.add.container(x, y);

        const bg = scene.add.rectangle(0, 0, width, height, bgColor)
            .setStrokeStyle(2, strokeColor)
            .setInteractive({ useHandCursor: true });

        const label = scene.add.text(0, 0, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSize,
            color: textColor
        }).setOrigin(0.5);

        container.add([bg, label]);

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(hoverColor);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
        });

        if (onClick) {
            bg.on('pointerdown', onClick);
        }

        return { container, bg, label };
    }

    static createIconButton(scene, x, y, iconKey, options = {}) {
        const {
            size = 40,
            bgColor = 0x3a3025,
            hoverColor = 0x4a4035,
            strokeColor = 0x666666,
            hoverStrokeColor = 0xe6c870,
            iconSize = 30,
            onClick = null,
            badge = null
        } = options;

        const container = scene.add.container(x, y);

        const bg = scene.add.rectangle(0, 0, size, size, bgColor)
            .setStrokeStyle(1, strokeColor)
            .setInteractive({ useHandCursor: true });

        const icon = scene.add.image(0, 0, iconKey)
            .setDisplaySize(iconSize, iconSize);

        container.add([bg, icon]);

        // Badge (count indicator)
        let badgeText = null;
        if (badge !== null) {
            const badgeBg = scene.add.circle(size / 2 - 5, -size / 2 + 5, 10, 0xe6c870);
            badgeText = scene.add.text(size / 2 - 5, -size / 2 + 5, badge.toString(), {
                fontSize: '12px',
                color: '#1a1510',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add([badgeBg, badgeText]);
        }

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(hoverColor);
            bg.setStrokeStyle(2, hoverStrokeColor);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
            bg.setStrokeStyle(1, strokeColor);
        });

        if (onClick) {
            bg.on('pointerdown', onClick);
        }

        return { container, bg, icon, badgeText };
    }

    static setEnabled(button, enabled) {
        if (button.bg) {
            button.bg.setAlpha(enabled ? 1 : 0.5);
            button.bg.input.enabled = enabled;
        }
        if (button.label) {
            button.label.setAlpha(enabled ? 1 : 0.5);
        }
        if (button.icon) {
            button.icon.setAlpha(enabled ? 1 : 0.5);
        }
    }

    static updateBadge(button, value) {
        if (button.badgeText) {
            button.badgeText.setText(value.toString());
        }
    }
}
