import { describe, it, expect } from 'vitest';
import { canModerate } from '../middleware/permissions.js';

describe('Moderation Hierarchy & Permissions', () => {
  it('prevents self-moderation', () => {
    const fakeMember: any = { id: 'user_1', guild: { ownerId: 'owner_99' } };
    const result = canModerate(fakeMember, fakeMember);
    expect(result.canMod).toBe(false);
    expect(result.reason).toContain('yourself');
  });

  it('prevents moderating the guild owner', () => {
    const mod: any = { id: 'mod_1', guild: { ownerId: 'owner_99' } };
    const owner: any = { id: 'owner_99', guild: { ownerId: 'owner_99' } };
    const result = canModerate(mod, owner);
    expect(result.canMod).toBe(false);
    expect(result.reason).toContain('server owner');
  });

  it('prevents moderating someone with higher or equal role position', () => {
    const mod: any = {
      id: 'mod_1',
      guild: { ownerId: 'owner_99', members: { me: { roles: { highest: { position: 10 } } } } },
      roles: { highest: { position: 5 } },
    };
    const targetWithHigherRole: any = {
      id: 'target_1',
      guild: { ownerId: 'owner_99' },
      roles: { highest: { position: 6 } },
    };
    const result = canModerate(mod, targetWithHigherRole);
    expect(result.canMod).toBe(false);
  });

  it('allows moderating someone with lower role position', () => {
    const mod: any = {
      id: 'mod_1',
      guild: { ownerId: 'owner_99', members: { me: { roles: { highest: { position: 10 } } } } },
      roles: { highest: { position: 5 } },
    };
    const lowerTarget: any = {
      id: 'target_1',
      guild: { ownerId: 'owner_99', members: { me: { roles: { highest: { position: 10 } } } } },
      roles: { highest: { position: 2 } },
    };
    const result = canModerate(mod, lowerTarget);
    expect(result.canMod).toBe(true);
  });
});
