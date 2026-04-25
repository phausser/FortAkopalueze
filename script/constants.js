export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

export const SHIP_ROTATION_SPEED = 3.0;
export const SHIP_THRUST = 250;
export const SHIP_DAMPING = 0.99;
export const SHIP_RADIUS = 12;
export const RESTITUTION = 0.25;
export const COLLISION_DAMAGE = 0.05;
export const INVINCIBLE_TIME = 0.5;

export const PROJECTILE_SPEED = 600;
export const PROJECTILE_LENGTH = 8;
export const FIRE_COOLDOWN = 0.2;
export const PARTICLE_SPEED = 120;
export const PARTICLE_LIFETIME = 0.42;
export const PARTICLE_COUNT = 12;

export const ROOM_COUNT_MIN = 8;
export const ROOM_COUNT_MAX = 12;
export const MIN_TUNNEL_H = 120;
export const BG_COLORS = ['#3a1111', '#113511', '#3d1111', '#11113a', '#3a3d11'];

export const ENEMY_HALF = 7;
export const ENEMY_PATROL_SPD = 80;
export const ENEMY_CHASE_SPD = 150;
export const ENEMY_CHASE_DIST = 400;
export const ENEMY_FLEE_DIST = 500;
export const ENEMY_MIN_DIST = 80;
export const ENEMY_FIRE_RATE = 1.5;
export const ENEMY_PROJ_SPEED = 300;
export const ENEMY_DMG = 0.08;

export const TURRET_HP = 3;
export const TURRET_FIRE_RATE = 2.0;
export const TURRET_ROT_SPEED = 2.0;
export const TURRET_RANGE = 380;

export const MISSILE_SPEED = 120;
export const MISSILE_TURN_SPEED = Math.PI / 60;
export const MISSILE_SPLASH_RADIUS = 40;
export const MISSILE_SPLASH_DAMAGE = 0.2;
export const MISSILE_EXPLODE_TIME = 0.4;
export const MISSILE_TRAIL_INTERVAL = 1 / 30;

export const LAUNCHER_RADIUS = 10;
export const LAUNCHER_HP = 3;
export const LAUNCHER_ALERT_DIST = 200;
export const LAUNCHER_FIRE_DIST = 150;
export const LAUNCHER_COOLDOWN = 10;

export const LASER_ON_MIN = 0.5;
export const LASER_ON_MAX = 2.0;
export const LASER_OFF_MIN = 1.0;
export const LASER_OFF_MAX = 5.0;
export const LASER_DAMAGE = 0.01;      // per frame, bypasses invincibility
export const LASER_EMITTER_HP = 4;
export const LASER_EMITTER_R = 6;      // hit radius for emitter
export const LASER_COLOR = '#ffffff';

export const State = {
  MENU: 'menu',
  PLAYING: 'playing',
  DEAD: 'dead',
  ESCAPE: 'escape',
  WIN: 'win',
};
