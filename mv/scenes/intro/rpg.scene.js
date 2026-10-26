// A pixel health bar and a two-line dialogue box on a dark CRT.
import { clamp } from './lib/util.js';
import { drawHearts } from './lib/rpg-hearts.js';
import { dialogueAt, drawDialogue } from './lib/rpg-type.js';

export default {
  id: 'intro/rpg',
  start: 122.05,
  end: 125.73,
  fonts: ['400 48px "Press Start 2P"','400 96px "Press Start 2P"'],
  async create(root,env) {
    const { ctx } = env.canvas(root);
    return {
      render(t) {
        ctx.setTransform(1,0,0,1,0,0);
        ctx.globalAlpha=1;
        ctx.fillStyle='#000001';
        ctx.fillRect(0,0,1920,1080);
        ctx.fillStyle='#121114';
        for(let y=0;y<1080;y+=3) ctx.fillRect(0,y,1920,2);

        drawHearts(ctx,t);

        ctx.fillStyle='#b6b1de';
        ctx.fillRect(120,774,6,180);
        ctx.fillRect(1794,774,6,180);
        ctx.fillRect(126,768,1668,6);
        ctx.fillRect(126,954,1668,6);
        ctx.fillStyle='#f0edff';
        ctx.fillRect(125,774,1,180);
        ctx.fillRect(1794,774,1,180);
        drawDialogue(ctx,dialogueAt(t));

        const alpha=.978*clamp((t-124.9833)/.0167);
        if(alpha>0) {
          ctx.save();
          ctx.globalAlpha=alpha;
          ctx.fillStyle='#f2effb';
          ctx.font='400 96px "Press Start 2P"';
          ctx.textBaseline='top';
          ctx.strokeStyle='#ffffff';ctx.lineWidth=.8;
          ctx.strokeText('DISHEARTENED',407,456);
          ctx.fillText('DISHEARTENED',407,456);
          ctx.restore();
        }
      },
    };
  },
};
