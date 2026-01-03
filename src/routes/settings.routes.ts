import { Router, Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/admin/settings
 * Busca todas as configurações (apenas admin)
 */
router.get('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.getAllSettings();
    
    // Oculta o token completo por segurança (mostra apenas se existe)
    const sanitizedSettings = settings.map(setting => {
      if (setting.key === 'webhook_secret_token' && setting.value) {
        return {
          ...setting,
          value: '****' // Oculta o valor real
        };
      }
      return setting;
    });

    res.json(sanitizedSettings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * GET /api/admin/settings/:key
 * Busca uma configuração específica (apenas admin)
 */
router.get('/:key', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await SettingsService.getSetting(key);

    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    // Oculta token por segurança
    if (key === 'webhook_secret_token' && setting.value) {
      res.json({
        ...setting,
        value: '****'
      });
      return;
    }

    res.json(setting);
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Cria ou atualiza uma configuração (apenas admin)
 */
router.put('/:key', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      res.status(400).json({ error: 'Value is required' });
      return;
    }

    const setting = await SettingsService.upsertSetting(
      key,
      value.toString(),
      description
    );

    res.json({
      message: 'Setting saved successfully',
      setting
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * DELETE /api/admin/settings/:key
 * Deleta uma configuração (apenas admin)
 */
router.delete('/:key', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    // Não permite deletar settings críticos
    const protectedKeys = ['webhook_secret_token', 'default_license_duration'];
    if (protectedKeys.includes(key)) {
      res.status(403).json({ error: 'Cannot delete protected setting' });
      return;
    }

    await SettingsService.deleteSetting(key);
    res.json({ message: 'Setting deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;
