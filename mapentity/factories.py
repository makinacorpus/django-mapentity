import factory

from django.contrib.auth import get_user_model


class UserFactory(factory.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    username = factory.Sequence('mary_poppins{0}'.format)
    first_name = factory.Sequence('Mary {0}'.format)
    last_name = factory.Sequence('Poppins {0}'.format)
    email = factory.LazyAttribute(lambda a: '{0}@example.com'.format(a.username))

    is_staff = False
    is_active = True
    is_superuser = False

    # last_login/date_joined

    @classmethod
    def _create(cls, model_class, **kwargs):
        pwd = kwargs.pop('password', None)
        user = model_class(**kwargs)
        user.set_password(pwd)
        user.save()
        return user


class SuperUserFactory(UserFactory):
    is_superuser = True
    is_staff = True
