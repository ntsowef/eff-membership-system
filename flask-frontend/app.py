"""
Flask Frontend Application for EFF Membership System
Connects to existing Node.js/Express backend API at http://localhost:5000
"""

from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_wtf.csrf import CSRFProtect
from flask_session import Session
from werkzeug.utils import secure_filename
import os
from datetime import timedelta
from config import Config
from forms import (
    PersonalInfoForm,
    ContactInfoForm,
    PartyDeclarationForm,
    PaymentForm
)
from services.api_service import APIService

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize application (creates directories)
Config.init_app(app)

print("Flask-Session Configuration:")
print(f"   SESSION_TYPE: {app.config.get('SESSION_TYPE')}")
print(f"   SESSION_FILE_DIR: {app.config.get('SESSION_FILE_DIR')}")
print(f"   SESSION_PERMANENT: {app.config.get('SESSION_PERMANENT')}")
print(f"   Directory exists: {os.path.exists(app.config.get('SESSION_FILE_DIR'))}")

# Initialize CSRF protection
csrf = CSRFProtect(app)

# Initialize server-side session storage
Session(app)

# Initialize API service
api_service = APIService(app.config['BACKEND_API_URL'])

# Configure session
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)

print("Flask-Session initialized successfully")

# Cache for lookup data
_lookup_cache = {}


def get_lookup_data():
    """
    Get all lookup data from API and cache it
    Returns dict with all lookup data
    """
    global _lookup_cache

    if not _lookup_cache:
        try:
            # Fetch all lookup data from API
            response = api_service.get_all_lookups()

            if response.get('success'):
                data = response.get('data', {})

                # Format data for form choices
                _lookup_cache = {
                    'genders': [(str(g.get('gender_id')), g.get('gender_name')) for g in data.get('genders', [])],
                    'races': [(str(r.get('race_id')), r.get('race_name')) for r in data.get('races', [])],
                    'citizenships': [(str(c.get('citizenship_id')), c.get('citizenship_name')) for c in data.get('citizenships', [])],
                    'languages': [(str(l.get('language_id')), l.get('language_name')) for l in data.get('languages', [])],
                    'occupations': [(str(o.get('occupation_id')), o.get('occupation_name')) for o in data.get('occupations', [])],
                    'qualifications': [(str(q.get('qualification_id')), q.get('qualification_name')) for q in data.get('qualificationLevels', [])],
                }
            else:
                # Fallback to default values if API fails
                app.logger.error(f"Failed to fetch lookup data: {response.get('message')}")
                _lookup_cache = get_default_lookup_data()
        except Exception as e:
            app.logger.error(f"Error fetching lookup data: {str(e)}")
            _lookup_cache = get_default_lookup_data()

    return _lookup_cache


def get_default_lookup_data():
    """
    Fallback lookup data if API is unavailable
    """
    return {
        'genders': [
            ('1', 'Male'),
            ('2', 'Female'),
            ('3', 'Other'),
            ('4', 'Prefer not to say')
        ],
        'races': [
            ('1', 'African'),
            ('2', 'Coloured'),
            ('3', 'Indian/Asian'),
            ('4', 'White'),
            ('5', 'Other')
        ],
        'citizenships': [
            ('1', 'South African Citizen'),
            ('2', 'Permanent Resident'),
            ('3', 'Work Permit'),
            ('4', 'Refugee'),
            ('5', 'Other')
        ],
        'languages': [
            ('1', 'English'),
            ('2', 'Afrikaans'),
            ('3', 'isiZulu'),
            ('4', 'isiXhosa'),
            ('5', 'Sesotho'),
            ('6', 'Setswana'),
            ('7', 'Sepedi'),
            ('8', 'Xitsonga'),
            ('9', 'siSwati'),
            ('10', 'Tshivenda'),
            ('11', 'isiNdebele')
        ],
        'occupations': [
            ('1', 'Student'),
            ('2', 'Unemployed'),
            ('3', 'Self-employed'),
            ('4', 'Professional'),
            ('5', 'Skilled Worker'),
            ('6', 'Unskilled Worker'),
            ('7', 'Retired'),
            ('8', 'Other')
        ],
        'qualifications': [
            ('1', 'No Formal Education'),
            ('2', 'Primary Education'),
            ('3', 'Secondary Education (Grade 9-11)'),
            ('4', 'Matric/Grade 12'),
            ('5', 'Certificate'),
            ('6', 'Diploma'),
            ('7', "Bachelor's Degree"),
            ('8', "Honours Degree"),
            ('9', "Master's Degree"),
            ('10', 'Doctoral Degree'),
            ('11', 'Other')
        ]
    }


@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')


@app.route('/application/start', methods=['GET'])
def start_application():
    """Start a new membership application"""
    # Clear any existing application data from session
    session.pop('application_data', None)
    session.pop('current_step', None)
    session['current_step'] = 1
    return redirect(url_for('personal_info'))


@app.route('/application/personal-info', methods=['GET', 'POST'])
def personal_info():
    """Step 1: Personal Information"""
    form = PersonalInfoForm()

    # Populate form choices from API
    lookup_data = get_lookup_data()
    form.gender.choices = [('', 'Select Gender')] + lookup_data['genders']
    form.language_id.choices = [('0', 'Select Language')] + lookup_data['languages']
    form.occupation_id.choices = [('0', 'Select Occupation')] + lookup_data['occupations']
    form.qualification_id.choices = [('0', 'Select Qualification')] + lookup_data['qualifications']
    form.citizenship_status.choices = [('0', 'Select Citizenship Status')] + lookup_data['citizenships']

    # Load existing data from session if available
    if 'application_data' in session and request.method == 'GET':
        # Convert date string back to date object for WTForms DateField
        session_data = session['application_data'].copy()
        if session_data.get('date_of_birth') and isinstance(session_data['date_of_birth'], str):
            from datetime import datetime
            try:
                session_data['date_of_birth'] = datetime.fromisoformat(session_data['date_of_birth']).date()
            except (ValueError, AttributeError):
                session_data['date_of_birth'] = None
        form.process(data=session_data)

    if form.validate_on_submit():
        # Store form data in session
        if 'application_data' not in session:
            session['application_data'] = {}

        session['application_data'].update({
            'first_name': form.first_name.data,
            'last_name': form.last_name.data,
            'id_number': form.id_number.data,
            'date_of_birth': form.date_of_birth.data.isoformat() if form.date_of_birth.data else None,
            'gender': form.gender.data,
            'language_id': form.language_id.data,
            'occupation_id': form.occupation_id.data,
            'qualification_id': form.qualification_id.data,
            'citizenship_status': form.citizenship_status.data,
        })

        # Note: Duplicate check and IEC verification are now handled client-side via AJAX
        # before form submission. The checks happen in personal_info.html JavaScript.
        print(f"✅ Form data received. Duplicate check and IEC verification already completed client-side.")

        session['current_step'] = 2
        session.modified = True

        # Debug: Check session after saving
        print(f"🔍 DEBUG - After saving Step 1:")
        print(f"   Session ID: {session.sid if hasattr(session, 'sid') else 'N/A'}")
        print(f"   application_data keys: {list(session.get('application_data', {}).keys())}")
        print(f"   current_step: {session.get('current_step')}")
        print(f"   session.modified: {session.modified}")

        flash('Personal information saved successfully!', 'success')
        return redirect(url_for('contact_info'))
    
    return render_template('application/personal_info.html', form=form, step=1)


@app.route('/application/id-exists-error')
def id_exists_error():
    """Display error page when ID number already exists"""
    # Check if there's an ID check error in session
    id_check_error = session.get('id_check_error')

    if not id_check_error or not id_check_error.get('exists'):
        # No error in session, redirect to start
        flash('Please start a new application.', 'info')
        return redirect(url_for('start_application'))

    # Render error page with details (don't clear session yet, user might want to go back)
    return render_template('application/id_exists_error.html',
                         id_check_error=id_check_error)


@app.route('/application/contact-info', methods=['GET', 'POST'])
def contact_info():
    """Step 2: Contact Information"""
    # Debug: Check session at entry
    print(f"🔍 DEBUG - Entering contact_info route:")
    print(f"   Session ID: {session.sid if hasattr(session, 'sid') else 'N/A'}")
    print(f"   current_step: {session.get('current_step')}")
    print(f"   application_data exists: {'application_data' in session}")
    if 'application_data' in session:
        print(f"   application_data keys: {list(session.get('application_data', {}).keys())}")
        print(f"   id_number in data: {session['application_data'].get('id_number')}")

    if session.get('current_step', 1) < 2:
        flash('Please complete the previous steps first.', 'warning')
        return redirect(url_for('personal_info'))

    # Validate that application_data exists and has required data from step 1
    if 'application_data' not in session or not session['application_data'].get('id_number'):
        print(f"❌ DEBUG - Session validation failed!")
        print(f"   application_data in session: {'application_data' in session}")
        if 'application_data' in session:
            print(f"   id_number value: {session['application_data'].get('id_number')}")
        flash('Session expired or form data lost. Please start over.', 'error')
        return redirect(url_for('start_application'))

    # Debug: Check IEC verification data in session
    print(f"🔍 Contact Info - IEC verification in session: {session.get('iec_verification')}")
    print(f"🔍 Contact Info - Application data in session: {session.get('application_data', {}).get('id_number')}")

    form = ContactInfoForm()

    # Load existing data from session if available
    if 'application_data' in session and request.method == 'GET':
        form.process(data=session['application_data'])
    
    if form.validate_on_submit():
        # Store form data in session - ensure application_data exists
        if 'application_data' not in session:
            session['application_data'] = {}

        session['application_data'].update({
            'email': form.email.data,
            'cell_number': form.cell_number.data,
            'alternative_number': form.alternative_number.data,
            'residential_address': form.residential_address.data,
            'postal_address': form.postal_address.data,
            'province_code': form.province_code.data,
            'district_code': form.district_code.data,
            'municipal_code': form.municipal_code.data,
            'ward_code': form.ward_code.data,
            'voting_district_code': form.voting_district_code.data,
        })
        session['current_step'] = 3
        session.modified = True

        flash('Contact information saved successfully!', 'success')
        return redirect(url_for('party_declaration'))
    
    return render_template('application/contact_info.html', form=form, step=2)


@app.route('/application/party-declaration', methods=['GET', 'POST'])
def party_declaration():
    """Step 3: Party Declaration & Signature"""
    if session.get('current_step', 1) < 3:
        flash('Please complete the previous steps first.', 'warning')
        return redirect(url_for('contact_info'))

    # Validate that application_data exists and has required data from previous steps
    if 'application_data' not in session or not session['application_data'].get('id_number'):
        flash('Session expired or form data lost. Please start over.', 'error')
        return redirect(url_for('start_application'))

    form = PartyDeclarationForm()

    # Load existing data from session if available
    if 'application_data' in session and request.method == 'GET':
        form.process(data=session['application_data'])
    
    if form.validate_on_submit():
        # Store form data in session - ensure application_data exists
        if 'application_data' not in session:
            session['application_data'] = {}

        session['application_data'].update({
            'signature_type': form.signature_type.data,
            'signature_data': form.signature_data.data,
            'declaration_accepted': form.declaration_accepted.data,
            'constitution_accepted': form.constitution_accepted.data,
            'reason_for_joining': form.reason_for_joining.data,
            'skills_experience': form.skills_experience.data,
            'referred_by': form.referred_by.data,
        })
        session['current_step'] = 4
        session.modified = True

        flash('Declaration saved successfully!', 'success')
        return redirect(url_for('payment_info'))
    
    return render_template('application/party_declaration.html', form=form, step=3)


@app.route('/application/payment', methods=['GET', 'POST'])
def payment_info():
    """Step 4: Payment Information"""
    if session.get('current_step', 1) < 4:
        flash('Please complete the previous steps first.', 'warning')
        return redirect(url_for('party_declaration'))

    # Validate that application_data exists and has required data from previous steps
    if 'application_data' not in session or not session['application_data'].get('id_number'):
        flash('Session expired or form data lost. Please start over.', 'error')
        return redirect(url_for('start_application'))

    form = PaymentForm()

    # Load existing data from session if available
    if 'application_data' in session and request.method == 'GET':
        form.process(data=session['application_data'])
    
    if form.validate_on_submit():
        # Store form data in session - ensure application_data exists
        if 'application_data' not in session:
            session['application_data'] = {}

        session['application_data'].update({
            'payment_method': form.payment_method.data,
            'payment_reference': form.payment_reference.data,
            'payment_amount': float(form.payment_amount.data) if form.payment_amount.data else None,
            'payment_notes': form.payment_notes.data,
        })
        session['current_step'] = 5
        session.modified = True

        print("\n" + "="*80)
        print("PAYMENT FORM SUBMITTED - SESSION STATE:")
        print("="*80)
        print(f"current_step: {session.get('current_step')}")
        print(f"application_data exists: {'application_data' in session}")
        print(f"id_number in application_data: {session.get('application_data', {}).get('id_number')}")
        print(f"session.modified: {session.modified}")
        print("="*80 + "\n")

        flash('Payment information saved successfully!', 'success')
        return redirect(url_for('review_submit'))
    
    return render_template('application/payment.html', form=form, step=4)


@app.route('/application/review', methods=['GET', 'POST'])
def review_submit():
    """Step 5: Review & Submit"""
    print("\n" + "="*80)
    print("REVIEW ROUTE ACCESSED - SESSION STATE:")
    print("="*80)
    print(f"current_step: {session.get('current_step', 'NOT SET')}")
    print(f"application_data exists: {'application_data' in session}")
    print(f"id_number in application_data: {session.get('application_data', {}).get('id_number', 'NOT SET')}")
    print(f"All session keys: {list(session.keys())}")
    print("="*80 + "\n")

    if session.get('current_step', 1) < 5:
        print(f"REDIRECT: current_step ({session.get('current_step', 1)}) < 5, redirecting to payment_info")
        flash('Please complete all previous steps first.', 'warning')
        return redirect(url_for('payment_info'))

    # Validate that application_data exists and has required data
    if 'application_data' not in session or not session['application_data'].get('id_number'):
        print(f"REDIRECT: Session validation failed, redirecting to start_application")
        print(f"  - application_data exists: {'application_data' in session}")
        print(f"  - id_number exists: {session.get('application_data', {}).get('id_number') is not None}")
        flash('Session expired or form data lost. Please start over.', 'error')
        return redirect(url_for('start_application'))

    if request.method == 'POST':
        # Submit application to backend API
        application_data = session.get('application_data', {}).copy()

        # Transform data to match backend expectations
        # Convert gender_id to gender name string
        gender_id = application_data.get('gender')
        if gender_id:
            gender_map = {
                '1': 'Male',
                '2': 'Female',
                '3': 'Other',
                '4': 'Prefer not to say'
            }
            application_data['gender'] = gender_map.get(str(gender_id), 'Prefer not to say')
            print(f"🔄 DEBUG: Converted gender from '{gender_id}' to '{application_data['gender']}'")

        # Convert citizenship_status from ID to string
        citizenship_id = application_data.get('citizenship_status')
        if citizenship_id:
            citizenship_map = {
                '1': 'South African Citizen',
                '2': 'Foreign National',
                '3': 'Permanent Resident'
            }
            application_data['citizenship_status'] = citizenship_map.get(str(citizenship_id), 'South African Citizen')
            print(f"🔄 DEBUG: Converted citizenship from '{citizenship_id}' to '{application_data['citizenship_status']}'")

        # Convert language_id, occupation_id, qualification_id to integers or REMOVE if empty
        # Backend expects these to be numbers if present, or omitted entirely (not null)
        for field in ['language_id', 'occupation_id', 'qualification_id']:
            if field in application_data:
                try:
                    value = application_data[field]
                    if value and str(value) != '0' and str(value).strip() != '':
                        application_data[field] = int(value)
                    else:
                        # Remove field entirely if empty/null (backend expects omission, not null)
                        del application_data[field]
                except (ValueError, TypeError):
                    # Remove field if conversion fails
                    if field in application_data:
                        del application_data[field]

        # Remove all null/None/empty string fields - backend expects omission, not null
        # This is critical for optional string fields like alternative_number, voting_district_code, etc.
        fields_to_remove = []
        for key, value in application_data.items():
            if value is None or value == '' or value == 'None':
                fields_to_remove.append(key)

        for field in fields_to_remove:
            del application_data[field]
            print(f"🗑️  Removed null/empty field: {field}")

        print(f"\n{'='*80}")
        print(f"📤 SUBMITTING APPLICATION TO BACKEND API")
        print(f"{'='*80}")
        print(f"Gender: {application_data.get('gender')}")
        print(f"Citizenship: {application_data.get('citizenship_status')}")
        print(f"Language ID: {application_data.get('language_id', '❌ OMITTED (empty)')}")
        print(f"Occupation ID: {application_data.get('occupation_id', '❌ OMITTED (empty)')}")
        print(f"Qualification ID: {application_data.get('qualification_id', '❌ OMITTED (empty)')}")
        print(f"\n📋 COMPLETE JSON PAYLOAD:")
        import json
        print(json.dumps(application_data, indent=2, default=str))
        print(f"{'='*80}\n")

        # Save payload to file for debugging
        with open('last_submission_payload.json', 'w') as f:
            json.dump(application_data, f, indent=2, default=str)
        print("💾 Saved payload to last_submission_payload.json")

        try:
            # Call backend API to create application
            print(f"🌐 Calling API: POST {app.config['BACKEND_API_URL']}/membership-applications")
            response = api_service.create_application(application_data)
            print(f"📥 Backend Response: {json.dumps(response, indent=2, default=str)}")

            # Save response to file for debugging
            with open('last_submission_response.json', 'w') as f:
                json.dump(response, f, indent=2, default=str)
            print("💾 Saved response to last_submission_response.json")

            if response.get('success'):
                application = response.get('data', {}).get('application', {})
                application_id = application.get('id')
                application_number = application.get('application_number')

                # Store application details in session for success page
                session['last_application'] = {
                    'id': application_id,
                    'application_number': application_number,
                    'phone_number': application.get('cell_number')
                }

                session.pop('application_data', None)
                session.pop('current_step', None)
                session.pop('iec_verification', None)

                flash('Application submitted successfully! An SMS with your application reference has been sent to your phone.', 'success')
                return redirect(url_for('application_success', application_id=application_id))
            else:
                flash(f"Error submitting application: {response.get('message', 'Unknown error')}", 'danger')
        except Exception as e:
            flash(f'Error submitting application: {str(e)}', 'danger')

    application_data = session.get('application_data', {})
    return render_template('application/review.html', data=application_data, step=5)


@app.route('/application/success/<int:application_id>')
def application_success(application_id):
    """Application success page"""
    # Get application details from session
    last_application = session.get('last_application', {})

    # If no session data, try to fetch from API
    if not last_application or last_application.get('id') != application_id:
        try:
            response = api_service.get_application_by_id(application_id)
            if response.get('success'):
                application = response.get('data', {}).get('application', {})
                last_application = {
                    'id': application.get('id'),
                    'application_number': application.get('application_number'),
                    'phone_number': application.get('cell_number')
                }
        except Exception as e:
            print(f"Error fetching application: {e}")
            last_application = {'id': application_id, 'application_number': f'APP{application_id:07d}'}

    return render_template('application/success.html',
                         application_id=application_id,
                         application_number=last_application.get('application_number'),
                         phone_number=last_application.get('phone_number'))


@app.route('/application/status/<application_number>')
def application_status(application_number):
    """Check application status"""
    try:
        response = api_service.get_application_by_number(application_number)
        if response.get('success'):
            application = response.get('data', {}).get('application', {})
            return render_template('application/status.html', application=application)
        else:
            flash('Application not found', 'warning')
            return redirect(url_for('index'))
    except Exception as e:
        flash(f'Error retrieving application: {str(e)}', 'danger')
        return redirect(url_for('index'))


# API endpoints for AJAX calls
@app.route('/api/lookups/<lookup_type>')
def get_lookups(lookup_type):
    """Get lookup data from backend API"""
    try:
        response = api_service.get_lookups(lookup_type)
        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/geographic/<geo_type>')
def get_geographic_data(geo_type):
    """Get geographic data from backend API"""
    try:
        # Get query parameters for filtering
        province = request.args.get('province')
        district = request.args.get('district')
        municipality = request.args.get('municipality')
        ward = request.args.get('ward')
        parent_code = request.args.get('parent_code')

        # Build params dict
        params = {}
        if province:
            params['province'] = province
        if district:
            params['district'] = district
        if municipality:
            params['municipality'] = municipality
        if ward:
            params['ward'] = ward
        if parent_code:
            params['parent_code'] = parent_code

        # Make request to backend
        if params:
            import requests
            url = f"{app.config['BACKEND_API_URL']}/geographic/{geo_type}"
            response = requests.get(url, params=params)
            return jsonify(response.json())
        else:
            response = api_service.get_geographic_data(geo_type, parent_code)
            return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/geographic/municipality-subregions')
def get_municipality_subregions():
    """Get sub-regions for a municipality (wards for metros, local municipalities for regular)"""
    try:
        municipality_code = request.args.get('municipality_code')

        if not municipality_code:
            return jsonify({'success': False, 'message': 'municipality_code parameter is required'}), 400

        # Make request to backend
        import requests
        url = f"{app.config['BACKEND_API_URL']}/geographic/municipality-subregions"
        response = requests.get(url, params={'municipality_code': municipality_code})
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/iec/verify-voter', methods=['POST'])
def verify_voter():
    """Verify voter registration using IEC API (public endpoint for membership application)"""
    try:
        data = request.get_json()
        print(f"DEBUG: Received IEC verification request: {data}")

        id_number = data.get('idNumber') if data else None

        if not id_number:
            print(f"DEBUG: No ID number provided. Request data: {data}")
            return jsonify({'success': False, 'message': 'ID number is required'}), 400

        print(f"DEBUG: Calling backend IEC API with ID: {id_number}")

        # Call backend IEC API public endpoint
        import requests
        url = f"{app.config['BACKEND_API_URL']}/iec/verify-voter-public"
        response = requests.post(url, json={'idNumber': id_number})

        print(f"DEBUG: Backend response status: {response.status_code}")
        print(f"DEBUG: Backend response: {response.json()}")

        return jsonify(response.json()), response.status_code
    except Exception as e:
        print(f"ERROR: IEC verification failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    return render_template('errors/500.html'), 500


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=3001,  # Different port from React frontend (3000)
        debug=True
    )

