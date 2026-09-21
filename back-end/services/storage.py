import cloudinary
import cloudinary.uploader
from cloudinary_storage.storage import MediaCloudinaryStorage, RESOURCE_TYPES
from django.core.files.uploadedfile import UploadedFile
from django.utils.deconstruct import deconstructible


@deconstructible
class AutoMediaCloudinaryStorage(MediaCloudinaryStorage):
    """
    Unified Cloudinary media storage that automatically selects the appropriate
    Cloudinary resource_type ('image', 'video', or 'raw') based on file extension.
    Allows both ImageField and FileField (for videos/banners) to use default storage
    without changing models or requiring database migrations.
    """
    VIDEO_EXTENSIONS = {'mp4', 'webm', 'mov', 'm4v', 'ogv', 'avi', 'mkv', 'flv', 'wmv'}
    RAW_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'csv', 'txt', 'json'}

    def _get_resource_type(self, name):
        if not name:
            return self.RESOURCE_TYPE

        ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        if ext in self.VIDEO_EXTENSIONS:
            return RESOURCE_TYPES['VIDEO']
        elif ext in self.RAW_EXTENSIONS:
            return RESOURCE_TYPES['RAW']
        return RESOURCE_TYPES['IMAGE']

    def _save(self, name, content):
        name = self._normalise_name(name)
        name = self._prepend_prefix(name)
        content = UploadedFile(content, name)
        response = self._upload(name, content)
        public_id = response['public_id']
        fmt = response.get('format')
        # Preserve extension in saved DB field value so format and resource_type remain identifiable
        if fmt and not public_id.lower().endswith(f".{fmt.lower()}"):
            return f"{public_id}.{fmt}"
        return public_id

    def delete(self, name):
        res_type = self._get_resource_type(name)
        # Strip extension for Cloudinary destroy API if image or video
        public_id = name.rsplit('.', 1)[0] if (res_type in [RESOURCE_TYPES['IMAGE'], RESOURCE_TYPES['VIDEO']] and '.' in name) else name
        try:
            response = cloudinary.uploader.destroy(public_id, invalidate=True, resource_type=res_type)
            return response.get('result') in ['ok', 'not found']
        except Exception:
            return False
