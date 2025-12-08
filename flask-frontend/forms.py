"""
Flask-WTF Forms for Membership Application
Matches backend API validation requirements
"""

from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import (
    StringField, 
    DateField, 
    SelectField, 
    TextAreaField, 
    DecimalField,
    BooleanField,
    HiddenField,
    IntegerField
)
from wtforms.validators import (
    DataRequired, 
    Email, 
    Length, 
    Optional, 
    Regexp,
    ValidationError
)
from datetime import datetime


def validate_id_number(form, field):
    """Validate South African ID number (13 digits)"""
    if field.data:
        if not field.data.isdigit() or len(field.data) != 13:
            raise ValidationError('ID number must be exactly 13 digits')


def validate_phone_number(form, field):
    """Validate phone number format"""
    if field.data:
        # Remove spaces and special characters
        cleaned = ''.join(filter(str.isdigit, field.data))
        if len(cleaned) < 10 or len(cleaned) > 20:
            raise ValidationError('Phone number must be between 10 and 20 digits')


class PersonalInfoForm(FlaskForm):
    """Step 1: Personal Information Form"""
    
    # Required fields
    first_name = StringField(
        'First Name',
        validators=[
            DataRequired(message='First name is required'),
            Length(min=2, max=100, message='First name must be between 2 and 100 characters')
        ]
    )
    
    last_name = StringField(
        'Last Name',
        validators=[
            DataRequired(message='Last name is required'),
            Length(min=2, max=100, message='Last name must be between 2 and 100 characters')
        ]
    )
    
    id_number = StringField(
        'South African ID Number',
        validators=[
            DataRequired(message='ID number is required'),
            validate_id_number
        ]
    )
    
    date_of_birth = DateField(
        'Date of Birth',
        validators=[DataRequired(message='Date of birth is required')],
        format='%Y-%m-%d'
    )
    
    gender = SelectField(
        'Gender',
        choices=[],  # Will be populated dynamically from API
        validators=[DataRequired(message='Gender is required')]
    )

    # Enhanced Personal Information fields
    language_id = SelectField(
        'Home Language',
        choices=[],  # Will be populated dynamically from API
        validators=[Optional()],
        coerce=lambda x: None if (not x or x == '0') else int(x)
    )

    occupation_id = SelectField(
        'Occupation',
        choices=[],  # Will be populated dynamically from API
        validators=[Optional()],
        coerce=lambda x: None if (not x or x == '0') else int(x)
    )

    qualification_id = SelectField(
        'Highest Qualification',
        choices=[],  # Will be populated dynamically from API
        validators=[Optional()],
        coerce=lambda x: None if (not x or x == '0') else int(x)
    )

    citizenship_status = SelectField(
        'Citizenship Status',
        choices=[],  # Will be populated dynamically from API
        validators=[Optional()],
        coerce=lambda x: None if (not x or x == '0') else int(x)
    )


class ContactInfoForm(FlaskForm):
    """Step 2: Contact Information Form"""
    
    # Contact details
    email = StringField(
        'Email Address',
        validators=[
            Optional(),
            Email(message='Invalid email address'),
            Length(max=255)
        ]
    )
    
    cell_number = StringField(
        'Cell Phone Number',
        validators=[
            Optional(),
            validate_phone_number
        ]
    )
    
    alternative_number = StringField(
        'Alternative Phone Number',
        validators=[
            Optional(),
            validate_phone_number
        ]
    )
    
    residential_address = StringField(
        'Residential Address',
        validators=[
            Optional(),
            Length(min=10, max=500, message='Address must be between 10 and 500 characters')
        ]
    )
    
    postal_address = StringField(
        'Postal Address',
        validators=[
            Optional(),
            Length(max=500)
        ]
    )
    
    # Geographic fields
    province_code = StringField(
        'Province',
        validators=[Optional()]
    )
    
    district_code = StringField(
        'District',
        validators=[Optional()]
    )
    
    municipal_code = StringField(
        'Municipality',
        validators=[Optional()]
    )
    
    ward_code = StringField(
        'Ward',
        validators=[
            Optional(),  # TEMPORARY: Made optional for testing
            Length(min=3, max=20)
        ]
    )
    
    voting_district_code = StringField(
        'Voting District',
        validators=[Optional()]
    )


class PartyDeclarationForm(FlaskForm):
    """Step 3: Party Declaration & Signature Form"""
    
    signature_type = SelectField(
        'Signature Type',
        choices=[
            ('typed', 'Typed Signature'),
            ('drawn', 'Drawn Signature')
        ],
        validators=[Optional()],
        default='typed'
    )
    
    signature_data = TextAreaField(
        'Signature',
        validators=[Optional()]
    )
    
    declaration_accepted = BooleanField(
        'I accept the party declaration',
        validators=[DataRequired(message='You must accept the party declaration')]
    )
    
    constitution_accepted = BooleanField(
        'I accept the party constitution',
        validators=[DataRequired(message='You must accept the party constitution')]
    )
    
    # Membership Details
    reason_for_joining = TextAreaField(
        'Reason for Joining',
        validators=[
            Optional(),
            Length(max=1000, message='Reason must not exceed 1000 characters')
        ]
    )
    
    skills_experience = TextAreaField(
        'Skills and Experience',
        validators=[
            Optional(),
            Length(max=1000, message='Skills and experience must not exceed 1000 characters')
        ]
    )
    
    referred_by = StringField(
        'Referred By',
        validators=[
            Optional(),
            Length(max=200, message='Referrer name must not exceed 200 characters')
        ]
    )


class PaymentForm(FlaskForm):
    """Step 4: Payment Information Form"""
    
    payment_method = SelectField(
        'Payment Method',
        choices=[
            ('', 'Select Payment Method'),
            ('Cash', 'Cash'),
            ('Bank Transfer', 'Bank Transfer'),
            ('EFT', 'EFT'),
            ('Credit Card', 'Credit Card'),
            ('Debit Card', 'Debit Card'),
            ('Mobile Payment', 'Mobile Payment')
        ],
        validators=[Optional()]
    )
    
    payment_reference = StringField(
        'Payment Reference',
        validators=[
            Optional(),
            Length(max=100, message='Payment reference must not exceed 100 characters')
        ]
    )
    
    payment_amount = DecimalField(
        'Payment Amount (ZAR)',
        places=2,
        validators=[Optional()]
    )
    
    payment_notes = TextAreaField(
        'Payment Notes',
        validators=[
            Optional(),
            Length(max=1000, message='Payment notes must not exceed 1000 characters')
        ]
    )
    
    # For cash payment receipt upload
    receipt_file = FileField(
        'Receipt Image',
        validators=[
            Optional(),
            FileAllowed(['jpg', 'jpeg', 'png', 'pdf'], 'Only image and PDF files are allowed')
        ]
    )


class CardPaymentForm(FlaskForm):
    """Card Payment Form for Peach Payment Gateway"""
    
    card_number = StringField(
        'Card Number',
        validators=[
            DataRequired(message='Card number is required'),
            Regexp(r'^\d{13,19}$', message='Invalid card number')
        ]
    )
    
    card_holder = StringField(
        'Card Holder Name',
        validators=[
            DataRequired(message='Card holder name is required'),
            Length(min=2, max=100)
        ]
    )
    
    expiry_month = SelectField(
        'Expiry Month',
        choices=[(str(i).zfill(2), str(i).zfill(2)) for i in range(1, 13)],
        validators=[DataRequired(message='Expiry month is required')]
    )
    
    expiry_year = SelectField(
        'Expiry Year',
        choices=[(str(i), str(i)) for i in range(datetime.now().year, datetime.now().year + 11)],
        validators=[DataRequired(message='Expiry year is required')]
    )
    
    cvv = StringField(
        'CVV',
        validators=[
            DataRequired(message='CVV is required'),
            Regexp(r'^\d{3,4}$', message='CVV must be 3 or 4 digits')
        ]
    )
    
    amount = DecimalField(
        'Amount',
        places=2,
        validators=[DataRequired(message='Amount is required')]
    )

