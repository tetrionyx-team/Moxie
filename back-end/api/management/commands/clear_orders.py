from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Order, OrderItem, OrderStatusHistory, NotificationLog

class Command(BaseCommand):
    help = "Safely delete all orders, order items, status history, and order notifications from the database."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Execute without interactive confirmation.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(">>> CLEAR ALL ORDERS <<<"))
        
        order_count = Order.objects.count()
        item_count = OrderItem.objects.count()
        history_count = OrderStatusHistory.objects.count()
        notif_count = NotificationLog.objects.filter(order__isnull=False).count()
        
        self.stdout.write(f"Current Order Count: {order_count}")
        self.stdout.write(f"Current OrderItem Count: {item_count}")
        self.stdout.write(f"Current StatusHistory Count: {history_count}")
        self.stdout.write(f"Current Order NotificationLog Count: {notif_count}")
        
        if order_count == 0 and item_count == 0:
            self.stdout.write(self.style.SUCCESS("Database is already empty of orders."))
            return

        with transaction.atomic():
            NotificationLog.objects.filter(order__isnull=False).delete()
            OrderStatusHistory.objects.all().delete()
            OrderItem.objects.all().delete()
            Order.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("SUCCESS: All orders have been completely cleared from the database."))
