-- Multilingual Birthday Message Templates
-- Creates table with birthday messages in all 11 official South African languages + English

-- Drop existing table if exists
DROP TABLE IF EXISTS birthday_message_templates CASCADE;

-- ============================================================================
-- TABLE: Birthday Message Templates
-- ============================================================================
CREATE TABLE birthday_message_templates (
    id SERIAL PRIMARY KEY,
    language_id INTEGER NOT NULL REFERENCES languages(language_id),
    language_name VARCHAR(50) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    message_template TEXT NOT NULL,
    greeting VARCHAR(100),
    closing VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_id)
);

-- Create index
CREATE INDEX idx_birthday_templates_language_id ON birthday_message_templates(language_id);
CREATE INDEX idx_birthday_templates_language_code ON birthday_message_templates(language_code);
CREATE INDEX idx_birthday_templates_active ON birthday_message_templates(is_active);

-- Update timestamp trigger
CREATE TRIGGER update_birthday_templates_updated_at
    BEFORE UPDATE ON birthday_message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INSERT: Birthday Message Templates in All Languages
-- ============================================================================

-- 1. English (Default)
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    2,
    'English',
    'en',
    'Happy Birthday {firstname}! The EFF wishes you a wonderful day filled with joy and prosperity. Thank you for being a valued member. Aluta Continua!',
    'Happy Birthday',
    'Aluta Continua!'
);

-- 2. Afrikaans
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    1,
    'Afrikaans',
    'af',
    'Gelukkige Verjaarsdag {firstname}! Die EFF wens jou ''n wonderlike dag vol vreugde en voorspoed toe. Dankie dat jy ''n gewaardeerde lid is. Aluta Continua!',
    'Gelukkige Verjaarsdag',
    'Aluta Continua!'
);

-- 3. isiZulu
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    5,
    'isiZulu',
    'zu',
    'Ilanga Lokuzalwa Elihle {firstname}! I-EFF ikufisela usuku oluhle olugcwele injabulo nempumelelo. Siyabonga ngokuba yilungu elibalulekile. Aluta Continua!',
    'Ilanga Lokuzalwa Elihle',
    'Aluta Continua!'
);

-- 4. isiXhosa
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    4,
    'isiXhosa',
    'xh',
    'Usuku Lokuzalwa Olumnandi {firstname}! I-EFF ikunqwenelela usuku oluhle oluzele yimincili nempumelelo. Siyabulela ngokuba lilungu elixabisekileyo. Aluta Continua!',
    'Usuku Lokuzalwa Olumnandi',
    'Aluta Continua!'
);

-- 5. Sepedi (Northern Sotho)
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    6,
    'Sepedi',
    'nso',
    'Letšatši la Matswalo le Lebotse {firstname}! EFF e go lakaletša letšatši le lebotse le le tletšego thabo le katlego. Re leboga go ba leloko la bohlokwa. Aluta Continua!',
    'Letšatši la Matswalo le Lebotse',
    'Aluta Continua!'
);

-- 6. Sesotho (Southern Sotho)
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    7,
    'Sesotho',
    'st',
    'Letsatsi la Tsoalo le Monate {firstname}! EFF e o lakaletsa letsatsi le monate le tletseng thabo le katleho. Re leboha ho ba setho sa bohlokwa. Aluta Continua!',
    'Letsatsi la Tsoalo le Monate',
    'Aluta Continua!'
);

-- 7. Setswana
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    8,
    'Setswana',
    'tn',
    'Letlhafula le le monate {firstname}! EFF e go eletsa letsatsi le le monate le le tletseng boipelo le katlego. Re leboga go nna leloko la botlhokwa. Aluta Continua!',
    'Letlhafula le le Monate',
    'Aluta Continua!'
);

-- 8. siSwati
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    9,
    'siSwati',
    'ss',
    'Lilanga Lekutalwa Lelihle {firstname}! I-EFF ikufisela lilanga lelihle lelinenjabulo nemphumelelo. Siyabonga ngekuba lilungu lelibalulekile. Aluta Continua!',
    'Lilanga Lekutalwa Lelihle',
    'Aluta Continua!'
);

-- 9. Tshivenda
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    10,
    'Tshivenda',
    've',
    'Ḓuvha ḽa Mabebo ḽo Ṱavhanyaho {firstname}! EFF i ni ṱalutshedza ḓuvha ḽo ṱavhanyaho ḽo ḓalaho lufuno na mbuyelo. Ri livhuwa nga u vha murado wa ndeme. Aluta Continua!',
    'Ḓuvha ḽa Mabebo ḽo Ṱavhanyaho',
    'Aluta Continua!'
);

-- 10. Xitsonga
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    11,
    'Xitsonga',
    'ts',
    'Siku ra Vutomi ro Tsakisa {firstname}! EFF yi ku lavela siku ro tsakisa leri tele ku tsakela na ku humelela. Hi khensa ku va xirho xa nkoka. Aluta Continua!',
    'Siku ra Vutomi ro Tsakisa',
    'Aluta Continua!'
);

-- 11. isiNdebele
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    3,
    'isiNdebele',
    'nr',
    'Ilanga Lokuzalwa Elihle {firstname}! I-EFF ikufisela ilanga elihle eligcwele injabulo nempumelelo. Siyabonga ngokuba lilungu elibalulekile. Aluta Continua!',
    'Ilanga Lokuzalwa Elihle',
    'Aluta Continua!'
);

-- 12. Other (Default to English)
INSERT INTO birthday_message_templates (language_id, language_name, language_code, message_template, greeting, closing)
VALUES (
    12,
    'Other',
    'ot',
    'Happy Birthday {firstname}! The EFF wishes you a wonderful day filled with joy and prosperity. Thank you for being a valued member. Aluta Continua!',
    'Happy Birthday',
    'Aluta Continua!'
);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE birthday_message_templates IS 'Birthday message templates in all South African official languages';
COMMENT ON COLUMN birthday_message_templates.message_template IS 'Template with {firstname} placeholder for personalization';
COMMENT ON COLUMN birthday_message_templates.greeting IS 'Birthday greeting phrase in the language';
COMMENT ON COLUMN birthday_message_templates.closing IS 'Closing phrase (usually Aluta Continua)';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE birthday_message_templates TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE birthday_message_templates_id_seq TO eff_admin;

-- Success message
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM birthday_message_templates;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Birthday message templates created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Templates created: % languages', template_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Languages included:';
    RAISE NOTICE '  1. English (en) - Default';
    RAISE NOTICE '  2. Afrikaans (af)';
    RAISE NOTICE '  3. isiZulu (zu)';
    RAISE NOTICE '  4. isiXhosa (xh)';
    RAISE NOTICE '  5. Sepedi (nso)';
    RAISE NOTICE '  6. Sesotho (st)';
    RAISE NOTICE '  7. Setswana (tn)';
    RAISE NOTICE '  8. siSwati (ss)';
    RAISE NOTICE '  9. Tshivenda (ve)';
    RAISE NOTICE '  10. Xitsonga (ts)';
    RAISE NOTICE '  11. isiNdebele (nr)';
    RAISE NOTICE '  12. Other (ot) - Falls back to English';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update vw_todays_birthdays view';
    RAISE NOTICE '  2. Test multilingual messages';
    RAISE NOTICE '';
END $$;

