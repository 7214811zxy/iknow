from django.db import models
# python manage.py makemigrations
# python manage.py migrate


# class UserGroup(models.Model):
#     title = models.CharField(max_length=32)
#
#
# class UserInfo(models.Model):
#     # 自增列
#     nid = models.BigAutoField(primary_key=True)
#     username = models.CharField(max_length=32)
#     password = models.CharField(max_length=64)
#     # age = models.IntegerField(null=True) 可以为空
#     age = models.IntegerField(default=1)
#     # 外键,on_delete=models.CASCADE是必须的
#     ug = models.ForeignKey("UserGroup", null=True, on_delete=models.CASCADE)


class FilePath(models.Model):
    path = models.CharField(max_length=255)
    type = models.CharField(max_length=32)


class Plane(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Bird(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Car(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Cat(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Dog(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Deer(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Frog(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Horse(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Ship(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Truck(models.Model):
    list_id = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)


class Upload(models.Model):
    fileName = models.IntegerField(null=False)
    path = models.ForeignKey("FilePath", on_delete=models.CASCADE)
    type = models.IntegerField(null=True)