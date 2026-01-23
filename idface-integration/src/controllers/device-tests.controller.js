const idFaceService = require('../services/idface.service');

class DeviceTestsController {
    async createUsers(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('create_objects.fcgi', {
                object: 'users',
                ...payload
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async loadUsers(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('load_objects.fcgi', {
                object: 'users',
                ...payload
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteUsers(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('destroy_objects.fcgi', {
                object: 'users',
                ...payload
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async modifyUsers(req, res) {
        try {
            const payload = req.body || {};
            const data = await idFaceService.postFcgi('modify_objects.fcgi', {
                object: 'users',
                ...payload
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async usersNoPhoto(req, res) {
        try {
            const payload = {
                object: 'users',
                where: [
                    { object: 'users', field: 'image_timestamp', operator: 'IS NULL', value: '', connector: 'OR' },
                    { object: 'users', field: 'image_timestamp', operator: '=', value: 0 }
                ]
            };
            const data = await idFaceService.postFcgi('load_objects.fcgi', payload);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async usersWithPhoto(req, res) {
        try {
            const payload = {
                object: 'users',
                where: [
                    { object: 'users', field: 'image_timestamp', operator: '!=', value: 0 }
                ]
            };
            const data = await idFaceService.postFcgi('load_objects.fcgi', payload);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async hashPassword(req, res) {
        try {
            const { password } = req.body;
            const data = await idFaceService.userHashPassword(password);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addField(req, res) {
        try {
            const data = await idFaceService.objectAddField(req.body);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async removeFields(req, res) {
        try {
            const data = await idFaceService.objectRemoveFields(req.body);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async setUserImage(req, res) {
        try {
            const { id } = req.params;
            const data = await idFaceService.userSetImage(id, req.body);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userGetImage(req, res) {
        try {
            const userId = req.query.user_id || req.body?.user_id;
            const getTimestamp = req.query.get_timestamp || req.body?.get_timestamp || 1;
            const data = await idFaceService.userGetImageWithTimestamp(userId, getTimestamp);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userListImages(req, res) {
        try {
            const getTimestamp = req.query.get_timestamp || 1;
            const data = await idFaceService.userListImages(getTimestamp);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userGetImageList(req, res) {
        try {
            const data = await idFaceService.postFcgi('user_get_image_list.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userSetImage(req, res) {
        try {
            const userId = req.query.user_id;
            const match = req.query.match ?? 1;
            const timestamp = req.query.timestamp ? `&timestamp=${Number(req.query.timestamp)}` : '';

            const path = `user_set_image.fcgi?user_id=${Number(userId)}&match=${Number(match)}${timestamp}`;
            const data = await idFaceService.postFcgi(path, req.body, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userSetImageList(req, res) {
        try {
            const data = await idFaceService.postFcgi('user_set_image_list.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userTestImage(req, res) {
        try {
            const data = await idFaceService.postFcgi('user_test_image.fcgi', req.body, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async userDestroyImage(req, res) {
        try {
            const data = await idFaceService.postFcgi('user_destroy_image.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async saveScreenshot(req, res) {
        try {
            const data = await idFaceService.postFcgi('save_screenshot.fcgi', req.body);
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async limitToDisplayRegion(req, res) {
        try {
            const data = await idFaceService.postFcgi('set_configuration.fcgi', {
                face_id: { limit_identification_to_display_region: "1" }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async setLedBrightness(req, res) {
        try {
            const { brightness = "100" } = req.body || {};
            const data = await idFaceService.postFcgi('set_configuration.fcgi', {
                led_white: { brightness: String(brightness) }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async setMinDetectDistance(req, res) {
        try {
            const { min_detect_bounds_width = "0.29" } = req.body || {};
            const data = await idFaceService.postFcgi('set_configuration.fcgi', {
                face_id: { min_detect_bounds_width: String(min_detect_bounds_width) }
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCatraInfo(req, res) {
        try {
            const data = await idFaceService.getFcgi('get_catra_info.fcgi', {
                responseType: 'json'
            });
            res.json(data.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DeviceTestsController;