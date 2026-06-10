import express from 'express';
import { getAllEnvSettings, updateEnvSettings } from '../../controllers/admin/envSettingController.js';
import { authMiddleware } from '../../core/auth/auth.middleware.js';
import { requireRoles } from '../../core/roles/role.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRoles('ADMIN', 'SUPER_ADMIN'));

router.route('/')
    .get(getAllEnvSettings)
    .put(updateEnvSettings);

export default router;
