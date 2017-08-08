/// <reference path="phaserTypescript/phaser.d.ts" />

var carpetaAssets: String = "assets/";

window.onload = () => {
  var game = new Game();
}

class Controls {
  public leftKey: Phaser.Key;
  public rightKey: Phaser.Key;
  public jumpKey: Phaser.Key;
  public crouchKey: Phaser.Key;

  //Singleton
  private static instance: Controls = null;
  static getInstance(): Controls {
    if (this.instance == null) {
      this.instance = new Controls();
    }
    return this.instance;
  }
}

class Game {
  game: Phaser.Game;
  height: number = 450;
  ratio: number = 16 / 9;
  //Gameobjects contiene a todos los elementos del juego
  gameObjects: Array<iGameObject>;
  public platforms: Phaser.Group;
  public player: Player;

  constructor() {
    this.game = new Phaser.Game(this.height * this.ratio, this.height,
      Phaser.AUTO ,'game', {
      preload: this.preload,
      create: this.start,
      update: this.update,
      render: this.render
    });
  }

  preload(): void {
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
  }

  start(): void {
    //Carga el fondo
    var bg = this.game.add.sprite(0, 0, "bg");

    //Manejo de las plataformas
    this.platforms = this.game.add.group();
    this.platforms.enableBody = true;
    this.platforms.create(0, 348, "floor").body.immovable = true;


    //Crear los controles
    var controles: Controls = Controls.getInstance();
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
    for (let gameObject of this.gameObjects) {
      this.game.physics.arcade.enable(gameObject.sprite);
    }

    for(let gameObject of this.gameObjects) {
      gameObject.start();
    }
  }

  update(): void {
    for(let gameObject of this.gameObjects) {
      gameObject.update();
    }
  }

  render(): void {
    // this.game.debug.body(this.player.sprite);
  }

}

interface iGameObject{
  sprite: Phaser.Sprite;
  game: Phaser.Game;
  start(): void;
  update(): void;
}

class Player implements iGameObject{
  sprite: Phaser.Sprite;
  public armSprite: Phaser.Sprite;
  bodySprite: Phaser.Sprite;
  game: Phaser.Game;
  moveSpeed: number = 250;
  platformGroup: Phaser.Group;
  controls: Controls = Controls.getInstance();
  dadoVuelta: boolean = false;
  gun: Gun;

  constructor(_sprite: Phaser.Sprite, _game: Phaser.Game) {
    this.sprite = _sprite;
    this.game = _game;
  }

  start(): void {
    this.sprite.anchor.set(0.5, 1);
    this.sprite.body.gravity.y = 1000;
    this.sprite.body.collideWorldBounds = true;
    this.bodySprite.anchor.setTo(0.5, 1);
    this.armSprite.anchor.set(0.20, 0.5);

    //Set default Gun
    this.gun = new Gun(this.game, this);
  }

  update(): void {
    //Colisiones con plataformas
    var platformHit = this.game.physics.arcade.collide(this.sprite, this.platformGroup);
    //Movement
    this.sprite.body.velocity.x = 0;
    if (this.controls.leftKey.isDown) {
      this.sprite.body.velocity.x = -this.moveSpeed;
    } else if (this.controls.rightKey.isDown) {
      this.sprite.body.velocity.x = this.moveSpeed;
    }
    //Jumping
    if (this.controls.jumpKey.isDown && this.sprite.body.touching.down && platformHit) {
      this.sprite.body.velocity.y = -600;
    }
    //Arm Rotation
    var anguloGrados = Utils.pointToCursor(this.armSprite, this.game) * (180/Math.PI);
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
    for (let p of this.gun.projectiles) {
      p.update();
    }
  }

  setPlatformGroup(_platform: Phaser.Group): void {
    this.platformGroup = _platform;
  }
  setArmSprite(_sprite: Phaser.Sprite): void {
    this.armSprite = _sprite;
    this.sprite.addChild(this.armSprite);
  }
  setBodySprite(_sprite: Phaser.Sprite): void {
    this.bodySprite = _sprite;
    this.sprite.addChild(this.bodySprite);
  }

}

class Gun implements iGameObject {
  game: Phaser.Game;
  sprite: Phaser.Sprite;
  projectiles: Projectile[] = [];
  player: Player;
  nextShotTime: number = 0;
  msBetweenShots: number = 100.0;

  constructor(_game: Phaser.Game, _player: Player) {
    this.game = _game;
    this.player = _player;
  }

  start(): void { }
  update(): void { }

  shoot() {
    if (this.game.time.now > this.nextShotTime) {
      this.nextShotTime = this.game.time.now + this.msBetweenShots;
      this.projectiles.push(new Projectile(this.game, this.game.add.sprite(
        this.player.armSprite.worldPosition.x + this.game.camera.position.x,
        this.player.armSprite.worldPosition.y + this.game.camera.position.y,
        "bullet"),
        this));
      console.log(this.projectiles);
    }
  }
}

class Projectile implements iGameObject  {
  game: Phaser.Game;
  sprite: Phaser.Sprite;
  gun: Gun;

  constructor(_game: Phaser.Game, _sprite: Phaser.Sprite, _gun: Gun) {
    this.game = _game;
    this.sprite = _sprite;
    this.gun = _gun;
  }

  start(): void {

  }

  update(): void {
    this.sprite.position.x += 10;
    if (!this.sprite.inCamera) {
      this.sprite.destroy(false);
      let index = this.gun.projectiles.indexOf(this, 0);
      if (index > -1)
        this.gun.projectiles.splice(index, 1);
    }
  }

}

class Utils {

  //  Devuelve el angulo para que el objeto apunte
  //  hacia el puntero usando coordenadas globales
  static pointToCursor(object, gameReference) {
    var x = (gameReference.input.mousePointer.x + gameReference.camera.x) - object.world.x;
    var y = (gameReference.input.mousePointer.y + gameReference.camera.y) - object.world.y;
    return Math.atan2(y, x);
  }
}
