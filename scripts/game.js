/// <reference path="phaserTypescript/phaser.d.ts" />
var carpetaAssets = "assets/";
window.onload = function () {
    var game = new Game();
};
var Controls = (function () {
    function Controls() {
    }
    Controls.getInstance = function () {
        if (this.instance == null) {
            this.instance = new Controls();
        }
        return this.instance;
    };
    return Controls;
}());
//Singleton
Controls.instance = null;
var Game = (function () {
    function Game() {
        this.height = 450;
        this.ratio = 16 / 9;
        this.game = new Phaser.Game(this.height * this.ratio, this.height, Phaser.AUTO, 'game', {
            preload: this.preload,
            create: this.start,
            update: this.update,
            render: this.render
        });
    }
    Game.prototype.preload = function () {
        /* Por alguna razón la variable no se inicializa si no es
         * dentro de una función y ya que esta función se
         * ejecuta antes que el resto, la inicalizo acá */
        this.gameObjects = [];
        //Cargar los sprites
        this.game.load.image("bg", carpetaAssets + "bg.png");
        this.game.load.image("playerBody", carpetaAssets + "player.png");
        this.game.load.image("floor", carpetaAssets + "floor.png");
        this.game.load.image("playerArm", carpetaAssets + "arm.png");
        this.game.load.image("bullet", carpetaAssets + "projectile.png");
    };
    Game.prototype.start = function () {
        //Carga el fondo
        var bg = this.game.add.sprite(0, 0, "bg");
        //Manejo de las plataformas
        this.platforms = this.game.add.group();
        this.platforms.enableBody = true;
        this.platforms.create(0, 348, "floor").body.immovable = true;
        //Crear los controles
        var controles = Controls.getInstance();
        controles.leftKey = this.game.input.keyboard.addKey(Phaser.Keyboard.A);
        controles.rightKey = this.game.input.keyboard.addKey(Phaser.Keyboard.D);
        controles.jumpKey = this.game.input.keyboard.addKey(Phaser.Keyboard.W);
        controles.crouchKey = this.game.input.keyboard.addKey(Phaser.Keyboard.S);
        //Crear el player
        this.player = new Player(this.game.add.sprite(0, 0), this.game);
        this.player.setBodySprite(this.game.add.sprite(0, 0, "playerBody"));
        this.player.setArmSprite(this.game.add.sprite(0, -32, "playerArm"));
        this.player.setPlatformGroup(this.platforms);
        //Crear los objetos
        //Cargar los objetos
        this.gameObjects.push(this.player);
        //Iniciar todos los sistemas del juego
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.world.setBounds(0, 0, bg.width, bg.height);
        this.game.camera.follow(this.player.sprite, Phaser.Camera.FOLLOW_LOCKON);
        //Habilita las fisicas para todos los gameobjects
        for (var _i = 0, _a = this.gameObjects; _i < _a.length; _i++) {
            var gameObject = _a[_i];
            this.game.physics.arcade.enable(gameObject.sprite);
        }
        for (var _b = 0, _c = this.gameObjects; _b < _c.length; _b++) {
            var gameObject = _c[_b];
            gameObject.start();
        }
    };
    Game.prototype.update = function () {
        for (var _i = 0, _a = this.gameObjects; _i < _a.length; _i++) {
            var gameObject = _a[_i];
            gameObject.update();
        }
    };
    Game.prototype.render = function () {
        // this.game.debug.body(this.player.sprite);
    };
    return Game;
}());
var Player = (function () {
    function Player(_sprite, _game) {
        this.moveSpeed = 250;
        this.controls = Controls.getInstance();
        this.dadoVuelta = false;
        this.sprite = _sprite;
        this.game = _game;
    }
    Player.prototype.start = function () {
        this.sprite.anchor.set(0.5, 1);
        this.sprite.body.gravity.y = 1000;
        this.sprite.body.collideWorldBounds = true;
        this.bodySprite.anchor.setTo(0.5, 1);
        this.armSprite.anchor.set(0.20, 0.5);
        //Set default Gun
        this.gun = new Gun(this.game, this);
    };
    Player.prototype.update = function () {
        //Colisiones con plataformas
        var platformHit = this.game.physics.arcade.collide(this.sprite, this.platformGroup);
        //Movement
        this.sprite.body.velocity.x = 0;
        if (this.controls.leftKey.isDown) {
            this.sprite.body.velocity.x = -this.moveSpeed;
        }
        else if (this.controls.rightKey.isDown) {
            this.sprite.body.velocity.x = this.moveSpeed;
        }
        //Jumping
        if (this.controls.jumpKey.isDown && this.sprite.body.touching.down && platformHit) {
            this.sprite.body.velocity.y = -600;
        }
        //Arm Rotation
        var anguloGrados = Utils.pointToCursor(this.armSprite, this.game) * (180 / Math.PI);
        if (anguloGrados < 90 && anguloGrados > -90) {
            if (this.dadoVuelta) {
                this.dadoVuelta = false;
                this.sprite.scale.x *= -1;
            }
            this.armSprite.rotation = Utils.pointToCursor(this.armSprite, this.game);
        }
        else {
            if (!this.dadoVuelta) {
                this.sprite.scale.x *= -1;
                this.dadoVuelta = true;
            }
            this.armSprite.rotation = -Utils.pointToCursor(this.armSprite, this.game) + Math.PI;
        }
        //Shooting
        if (this.game.input.activePointer.isDown) {
            this.gun.shoot();
        }
        for (var _i = 0, _a = this.gun.projectiles; _i < _a.length; _i++) {
            var p = _a[_i];
            p.update();
        }
    };
    Player.prototype.setPlatformGroup = function (_platform) {
        this.platformGroup = _platform;
    };
    Player.prototype.setArmSprite = function (_sprite) {
        this.armSprite = _sprite;
        this.sprite.addChild(this.armSprite);
    };
    Player.prototype.setBodySprite = function (_sprite) {
        this.bodySprite = _sprite;
        this.sprite.addChild(this.bodySprite);
    };
    return Player;
}());
var Gun = (function () {
    function Gun(_game, _player) {
        this.projectiles = [];
        this.nextShotTime = 0;
        this.msBetweenShots = 100.0;
        this.game = _game;
        this.player = _player;
    }
    Gun.prototype.start = function () { };
    Gun.prototype.update = function () { };
    Gun.prototype.shoot = function () {
        if (this.game.time.now > this.nextShotTime) {
            this.nextShotTime = this.game.time.now + this.msBetweenShots;
            this.projectiles.push(new Projectile(this.game, this.game.add.sprite(this.player.armSprite.worldPosition.x + this.game.camera.position.x, this.player.armSprite.worldPosition.y + this.game.camera.position.y, "bullet"), this));
            console.log(this.projectiles);
        }
    };
    return Gun;
}());
var Projectile = (function () {
    function Projectile(_game, _sprite, _gun) {
        this.game = _game;
        this.sprite = _sprite;
        this.gun = _gun;
    }
    Projectile.prototype.start = function () {
    };
    Projectile.prototype.update = function () {
        this.sprite.position.x += 10;
        if (!this.sprite.inCamera) {
            this.sprite.destroy(false);
            var index = this.gun.projectiles.indexOf(this, 0);
            if (index > -1)
                this.gun.projectiles.splice(index, 1);
        }
    };
    return Projectile;
}());
var Utils = (function () {
    function Utils() {
    }
    //  Devuelve el angulo para que el objeto apunte
    //  hacia el puntero usando coordenadas globales
    Utils.pointToCursor = function (object, gameReference) {
        var x = (gameReference.input.mousePointer.x + gameReference.camera.x) - object.world.x;
        var y = (gameReference.input.mousePointer.y + gameReference.camera.y) - object.world.y;
        return Math.atan2(y, x);
    };
    return Utils;
}());
