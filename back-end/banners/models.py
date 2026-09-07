from django.db import models


class Banner(models.Model):
    title = models.CharField(max_length=200, blank=True)

    subtitle = models.CharField(max_length=300, blank=True)

    image = models.FileField(upload_to='banners/')

    button_text = models.CharField(max_length=100, blank=True)

    button_link = models.CharField(max_length=300, blank=True)

    display_order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Banner {self.id}"