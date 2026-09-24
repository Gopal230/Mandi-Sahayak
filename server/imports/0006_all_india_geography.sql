-- =============================================================================
-- FarmQueue — all-India demonstration geography and centres
--
-- CLASSIFICATION SUMMARY — read this before citing anything below.
--
--   OFFICIAL   : nothing in this file. Not one row.
--
--   CONFIGURED : every state, district, procurement centre, lane, working
--                hour, slot parameter and crop eligibility below. These exist
--                so the demonstration can be booked against anywhere in the
--                country. They are NOT government records.
--
--   TEST       : nothing in this file.
--
-- THIS IS NOT A MIGRATION. It is a data import, run after the schema exists.
-- It requires migration 0023, which permits a CONFIGURED state to carry no LGD
-- code. Re-running it is safe: every insert is guarded and inserts nothing the
-- second time.
--
-- WHY THIS FILE EXISTS
--   Import 0002 seeded five demonstration districts in Uttar Pradesh. Officer
--   registration requires a centreId and farmer booking lists centres, so
--   outside those five districts both flows had nothing to offer. A farmer in
--   Kerala could not book and an officer in Kerala could not apply.
--
-- WHAT THE DISTRICT LIST IS, AND WHAT IT IS NOT
--   Source     The district list already bundled with this application at
--              src/data/indianDistricts.js, reproduced here verbatim apart
--              from the two corrections noted below.
--   Type       APPLICATION_BUNDLED — NOT a government extract.
--
--   This is deliberately NOT recorded in data_sources. A data_sources row
--   asserts that a publication was retrieved from a publisher on a date, and
--   no such retrieval happened: this list ships with the frontend and its own
--   origin is unrecorded. Inventing a citation for it would be worse than
--   having none, so every row below carries source_id NULL and data_type
--   CONFIGURED, which is exactly what "configured, unsourced" is for.
--
--   The list predates several state reorganisations. Ladakh, the Andaman and
--   Nicobar Islands and the merger of Daman and Diu with Dadra and Nagar
--   Haveli are absent or stale, and districts created after the list was
--   written are missing. Those gaps are left as they are. Filling them from
--   memory would mean writing down government geography nobody retrieved,
--   which is the habit these files exist to prevent.
--
--   Two corrections were applied, both to transport artefacts rather than to
--   the names themselves: the HTML entity "&amp;" is decoded to "&", and
--   stray whitespace is collapsed and trimmed. No name is translated,
--   expanded, abbreviated, title-cased or otherwise edited.
--
--   The decoding affects exactly one district, Lahaul & Spiti in Himachal
--   Pradesh, and the server's fallback resolver in src/data/allDistricts.ts
--   applies the same correction so that the shipped frontend — which still
--   holds the raw "&amp;" — resolves to the row seeded here instead of
--   creating a second one beside it.
--
-- NO STATE CARRIES AN LGD CODE
--   Only Uttar Pradesh has one, read from the LGD portal in import 0002, and
--   this file does not touch that row. The LGD bulk download is still
--   CAPTCHA-protected and the data.gov.in API still requires a registered key.
--   Neither was circumvented, so the remaining states carry lgd_code NULL,
--   permitted for CONFIGURED rows by migration 0023. Districts carry NULL for
--   the same reason, permitted since 0012.
--
-- CENTRE IDENTIFIERS ARE NOT GOVERNMENT IDS
--   One centre is created per district, coded DEMO-<STATE>-<DISTRICT>-01. The
--   DEMO- prefix is deliberate and matches import 0002: no reader, and no
--   future importer, should mistake these for official procurement centre
--   identifiers. No government publishes a national procurement centre list in
--   machine-readable form; each state agency publishes its own, and none was
--   retrieved. These centres are demonstration fixtures.
--
-- WHAT IS DELIBERATELY ABSENT
--   * No mandi rows and no mandi links. Import 0004 loaded real markets for
--     five Uttar Pradesh districts from a named publication. No equivalent was
--     retrieved for anywhere else, so every centre here keeps mandi_id NULL.
--   * No latitude or longitude. Plausible coordinates are still invented ones.
--   * No addresses.
--   * No storage facilities and no storage inventory. Every centre keeps the
--     ADVISORY default and reports NO_CAPACITY_DATA_FOR_CENTRE.
--   * No districts beyond the bundled list, as set out above.
--
-- KNOWN INTERACTION WITH THE ALREADY-SHIPPED FRONTEND
--   The frontend's district picker maps the bundled names onto the ids this
--   import creates using a lookup keyed by district NAME ALONE, ignoring the
--   state. Five names occur in two states each:
--
--       Aurangabad   Bihar        / Maharashtra
--       Balrampur    Chhattisgarh / Uttar Pradesh
--       Bilaspur     Chhattisgarh / Himachal Pradesh
--       Hamirpur     Himachal Pradesh / Uttar Pradesh
--       Pratapgarh   Rajasthan    / Uttar Pradesh
--
--   For those five, both entries in the picker resolve to whichever of the two
--   rows the lookup saw last, so a farmer choosing one may be recorded against
--   the other. Nothing fails: the id is a real district, officer registration's
--   centre-in-district check still agrees with it, and booking is unaffected
--   because centres are chosen separately. Only the recorded home district's
--   STATE can be wrong, which in turn only affects the HOME_DISTRICT proximity
--   tag used to order the centre list.
--
--   This is a property of the shipped client, not of the data below, and it is
--   recorded here rather than worked around. The workarounds available on this
--   side — withholding five real districts from /reference/districts, or
--   renaming them so the lookup misses — would each corrupt the reference data
--   to paper over a display-layer bug. Fixing the picker to key on state and
--   name resolves it whenever the frontend is next changed.
--
-- REQUIRED PARAMETER
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -v configured_by=<uuid-of-an-admin-user> \
--        -f server/imports/0006_all_india_geography.sql
-- =============================================================================

BEGIN;

-- Resolve the configuring administrator outside any dollar-quoted block, since
-- psql does not substitute :variables inside $$ ... $$.
CREATE TEMP TABLE _cfg_ctx ON COMMIT DROP AS
SELECT NULLIF(:'configured_by', '')::uuid AS admin_id;

DO $$
DECLARE admin_id uuid;
BEGIN
    SELECT c.admin_id INTO admin_id FROM _cfg_ctx c;
    IF admin_id IS NULL THEN
        RAISE EXCEPTION
            'configured_by must be supplied: psql -v configured_by=<uuid> ...';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = admin_id AND r.code = 'ADMIN'
    ) THEN
        RAISE EXCEPTION
            'user % is not an ADMIN; configuring centres requires the ADMIN role', admin_id;
    END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- The bundled list, verbatim. One row per district, carrying the centre code
-- that district's demonstration centre will be given.
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _geo (
    state        text NOT NULL,
    district     text NOT NULL,
    centre_code  text NOT NULL
) ON COMMIT DROP;

INSERT INTO _geo (state, district, centre_code) VALUES
    -- Andhra Pradesh
    ('Andhra Pradesh'             , 'Anantapur'                              , 'DEMO-AP-ANANTAPUR-01'),
    ('Andhra Pradesh'             , 'Chittoor'                               , 'DEMO-AP-CHITTOOR-01'),
    ('Andhra Pradesh'             , 'East Godavari'                          , 'DEMO-AP-EASTGODAVARI-01'),
    ('Andhra Pradesh'             , 'Guntur'                                 , 'DEMO-AP-GUNTUR-01'),
    ('Andhra Pradesh'             , 'Krishna'                                , 'DEMO-AP-KRISHNA-01'),
    ('Andhra Pradesh'             , 'Kurnool'                                , 'DEMO-AP-KURNOOL-01'),
    ('Andhra Pradesh'             , 'Nellore'                                , 'DEMO-AP-NELLORE-01'),
    ('Andhra Pradesh'             , 'Prakasam'                               , 'DEMO-AP-PRAKASAM-01'),
    ('Andhra Pradesh'             , 'Srikakulam'                             , 'DEMO-AP-SRIKAKULAM-01'),
    ('Andhra Pradesh'             , 'Visakhapatnam'                          , 'DEMO-AP-VISAKHAPATNAM-01'),
    ('Andhra Pradesh'             , 'Vizianagaram'                           , 'DEMO-AP-VIZIANAGARAM-01'),
    ('Andhra Pradesh'             , 'West Godavari'                          , 'DEMO-AP-WESTGODAVARI-01'),
    ('Andhra Pradesh'             , 'YSR Kadapa'                             , 'DEMO-AP-YSRKADAPA-01'),

    -- Arunachal Pradesh
    ('Arunachal Pradesh'          , 'Tawang'                                 , 'DEMO-AR-TAWANG-01'),
    ('Arunachal Pradesh'          , 'West Kameng'                            , 'DEMO-AR-WESTKAMENG-01'),
    ('Arunachal Pradesh'          , 'East Kameng'                            , 'DEMO-AR-EASTKAMENG-01'),
    ('Arunachal Pradesh'          , 'Papum Pare'                             , 'DEMO-AR-PAPUMPARE-01'),
    ('Arunachal Pradesh'          , 'Kurung Kumey'                           , 'DEMO-AR-KURUNGKUMEY-01'),
    ('Arunachal Pradesh'          , 'Kra Daadi'                              , 'DEMO-AR-KRADAADI-01'),
    ('Arunachal Pradesh'          , 'Lower Subansiri'                        , 'DEMO-AR-LOWERSUBANSIRI-01'),
    ('Arunachal Pradesh'          , 'Upper Subansiri'                        , 'DEMO-AR-UPPERSUBANSIRI-01'),
    ('Arunachal Pradesh'          , 'West Siang'                             , 'DEMO-AR-WESTSIANG-01'),
    ('Arunachal Pradesh'          , 'East Siang'                             , 'DEMO-AR-EASTSIANG-01'),
    ('Arunachal Pradesh'          , 'Siang'                                  , 'DEMO-AR-SIANG-01'),
    ('Arunachal Pradesh'          , 'Upper Siang'                            , 'DEMO-AR-UPPERSIANG-01'),
    ('Arunachal Pradesh'          , 'Lower Siang'                            , 'DEMO-AR-LOWERSIANG-01'),
    ('Arunachal Pradesh'          , 'Lower Dibang Valley'                    , 'DEMO-AR-LOWERDIBANGVALLEY-01'),
    ('Arunachal Pradesh'          , 'Dibang Valley'                          , 'DEMO-AR-DIBANGVALLEY-01'),
    ('Arunachal Pradesh'          , 'Anjaw'                                  , 'DEMO-AR-ANJAW-01'),
    ('Arunachal Pradesh'          , 'Lohit'                                  , 'DEMO-AR-LOHIT-01'),
    ('Arunachal Pradesh'          , 'Namsai'                                 , 'DEMO-AR-NAMSAI-01'),
    ('Arunachal Pradesh'          , 'Changlang'                              , 'DEMO-AR-CHANGLANG-01'),
    ('Arunachal Pradesh'          , 'Tirap'                                  , 'DEMO-AR-TIRAP-01'),
    ('Arunachal Pradesh'          , 'Longding'                               , 'DEMO-AR-LONGDING-01'),

    -- Assam
    ('Assam'                      , 'Baksa'                                  , 'DEMO-AS-BAKSA-01'),
    ('Assam'                      , 'Barpeta'                                , 'DEMO-AS-BARPETA-01'),
    ('Assam'                      , 'Biswanath'                              , 'DEMO-AS-BISWANATH-01'),
    ('Assam'                      , 'Bongaigaon'                             , 'DEMO-AS-BONGAIGAON-01'),
    ('Assam'                      , 'Cachar'                                 , 'DEMO-AS-CACHAR-01'),
    ('Assam'                      , 'Charaideo'                              , 'DEMO-AS-CHARAIDEO-01'),
    ('Assam'                      , 'Chirang'                                , 'DEMO-AS-CHIRANG-01'),
    ('Assam'                      , 'Darrang'                                , 'DEMO-AS-DARRANG-01'),
    ('Assam'                      , 'Dhemaji'                                , 'DEMO-AS-DHEMAJI-01'),
    ('Assam'                      , 'Dhubri'                                 , 'DEMO-AS-DHUBRI-01'),
    ('Assam'                      , 'Dibrugarh'                              , 'DEMO-AS-DIBRUGARH-01'),
    ('Assam'                      , 'Goalpara'                               , 'DEMO-AS-GOALPARA-01'),
    ('Assam'                      , 'Golaghat'                               , 'DEMO-AS-GOLAGHAT-01'),
    ('Assam'                      , 'Hailakandi'                             , 'DEMO-AS-HAILAKANDI-01'),
    ('Assam'                      , 'Hojai'                                  , 'DEMO-AS-HOJAI-01'),
    ('Assam'                      , 'Jorhat'                                 , 'DEMO-AS-JORHAT-01'),
    ('Assam'                      , 'Kamrup Metropolitan'                    , 'DEMO-AS-KAMRUPMETROPOLITAN-01'),
    ('Assam'                      , 'Kamrup'                                 , 'DEMO-AS-KAMRUP-01'),
    ('Assam'                      , 'Karbi Anglong'                          , 'DEMO-AS-KARBIANGLONG-01'),
    ('Assam'                      , 'Karimganj'                              , 'DEMO-AS-KARIMGANJ-01'),
    ('Assam'                      , 'Kokrajhar'                              , 'DEMO-AS-KOKRAJHAR-01'),
    ('Assam'                      , 'Lakhimpur'                              , 'DEMO-AS-LAKHIMPUR-01'),
    ('Assam'                      , 'Majuli'                                 , 'DEMO-AS-MAJULI-01'),
    ('Assam'                      , 'Morigaon'                               , 'DEMO-AS-MORIGAON-01'),
    ('Assam'                      , 'Nagaon'                                 , 'DEMO-AS-NAGAON-01'),
    ('Assam'                      , 'Nalbari'                                , 'DEMO-AS-NALBARI-01'),
    ('Assam'                      , 'Dima Hasao'                             , 'DEMO-AS-DIMAHASAO-01'),
    ('Assam'                      , 'Sivasagar'                              , 'DEMO-AS-SIVASAGAR-01'),
    ('Assam'                      , 'Sonitpur'                               , 'DEMO-AS-SONITPUR-01'),
    ('Assam'                      , 'South Salmara-Mankachar'                , 'DEMO-AS-SOUTHSALMARAMANKACHAR-01'),
    ('Assam'                      , 'Tinsukia'                               , 'DEMO-AS-TINSUKIA-01'),
    ('Assam'                      , 'Udalguri'                               , 'DEMO-AS-UDALGURI-01'),
    ('Assam'                      , 'West Karbi Anglong'                     , 'DEMO-AS-WESTKARBIANGLONG-01'),

    -- Bihar
    ('Bihar'                      , 'Araria'                                 , 'DEMO-BR-ARARIA-01'),
    ('Bihar'                      , 'Arwal'                                  , 'DEMO-BR-ARWAL-01'),
    ('Bihar'                      , 'Aurangabad'                             , 'DEMO-BR-AURANGABAD-01'),
    ('Bihar'                      , 'Banka'                                  , 'DEMO-BR-BANKA-01'),
    ('Bihar'                      , 'Begusarai'                              , 'DEMO-BR-BEGUSARAI-01'),
    ('Bihar'                      , 'Bhagalpur'                              , 'DEMO-BR-BHAGALPUR-01'),
    ('Bihar'                      , 'Bhojpur'                                , 'DEMO-BR-BHOJPUR-01'),
    ('Bihar'                      , 'Buxar'                                  , 'DEMO-BR-BUXAR-01'),
    ('Bihar'                      , 'Darbhanga'                              , 'DEMO-BR-DARBHANGA-01'),
    ('Bihar'                      , 'East Champaran (Motihari)'              , 'DEMO-BR-EASTCHAMPARANMOTIHARI-01'),
    ('Bihar'                      , 'Gaya'                                   , 'DEMO-BR-GAYA-01'),
    ('Bihar'                      , 'Gopalganj'                              , 'DEMO-BR-GOPALGANJ-01'),
    ('Bihar'                      , 'Jamui'                                  , 'DEMO-BR-JAMUI-01'),
    ('Bihar'                      , 'Jehanabad'                              , 'DEMO-BR-JEHANABAD-01'),
    ('Bihar'                      , 'Kaimur (Bhabua)'                        , 'DEMO-BR-KAIMURBHABUA-01'),
    ('Bihar'                      , 'Katihar'                                , 'DEMO-BR-KATIHAR-01'),
    ('Bihar'                      , 'Khagaria'                               , 'DEMO-BR-KHAGARIA-01'),
    ('Bihar'                      , 'Kishanganj'                             , 'DEMO-BR-KISHANGANJ-01'),
    ('Bihar'                      , 'Lakhisarai'                             , 'DEMO-BR-LAKHISARAI-01'),
    ('Bihar'                      , 'Madhepura'                              , 'DEMO-BR-MADHEPURA-01'),
    ('Bihar'                      , 'Madhubani'                              , 'DEMO-BR-MADHUBANI-01'),
    ('Bihar'                      , 'Munger (Monghyr)'                       , 'DEMO-BR-MUNGERMONGHYR-01'),
    ('Bihar'                      , 'Muzaffarpur'                            , 'DEMO-BR-MUZAFFARPUR-01'),
    ('Bihar'                      , 'Nalanda'                                , 'DEMO-BR-NALANDA-01'),
    ('Bihar'                      , 'Nawada'                                 , 'DEMO-BR-NAWADA-01'),
    ('Bihar'                      , 'Patna'                                  , 'DEMO-BR-PATNA-01'),
    ('Bihar'                      , 'Purnia (Purnea)'                        , 'DEMO-BR-PURNIAPURNEA-01'),
    ('Bihar'                      , 'Rohtas'                                 , 'DEMO-BR-ROHTAS-01'),
    ('Bihar'                      , 'Saharsa'                                , 'DEMO-BR-SAHARSA-01'),
    ('Bihar'                      , 'Samastipur'                             , 'DEMO-BR-SAMASTIPUR-01'),
    ('Bihar'                      , 'Saran'                                  , 'DEMO-BR-SARAN-01'),
    ('Bihar'                      , 'Sheikhpura'                             , 'DEMO-BR-SHEIKHPURA-01'),
    ('Bihar'                      , 'Sheohar'                                , 'DEMO-BR-SHEOHAR-01'),
    ('Bihar'                      , 'Sitamarhi'                              , 'DEMO-BR-SITAMARHI-01'),
    ('Bihar'                      , 'Siwan'                                  , 'DEMO-BR-SIWAN-01'),
    ('Bihar'                      , 'Supaul'                                 , 'DEMO-BR-SUPAUL-01'),
    ('Bihar'                      , 'Vaishali'                               , 'DEMO-BR-VAISHALI-01'),
    ('Bihar'                      , 'West Champaran'                         , 'DEMO-BR-WESTCHAMPARAN-01'),

    -- Chandigarh (UT)
    ('Chandigarh (UT)'            , 'Chandigarh'                             , 'DEMO-CH-CHANDIGARH-01'),

    -- Chhattisgarh
    ('Chhattisgarh'               , 'Balod'                                  , 'DEMO-CG-BALOD-01'),
    ('Chhattisgarh'               , 'Baloda Bazar'                           , 'DEMO-CG-BALODABAZAR-01'),
    ('Chhattisgarh'               , 'Balrampur'                              , 'DEMO-CG-BALRAMPUR-01'),
    ('Chhattisgarh'               , 'Bastar'                                 , 'DEMO-CG-BASTAR-01'),
    ('Chhattisgarh'               , 'Bemetara'                               , 'DEMO-CG-BEMETARA-01'),
    ('Chhattisgarh'               , 'Bijapur'                                , 'DEMO-CG-BIJAPUR-01'),
    ('Chhattisgarh'               , 'Bilaspur'                               , 'DEMO-CG-BILASPUR-01'),
    ('Chhattisgarh'               , 'Dantewada (South Bastar)'               , 'DEMO-CG-DANTEWADASOUTHBASTAR-01'),
    ('Chhattisgarh'               , 'Dhamtari'                               , 'DEMO-CG-DHAMTARI-01'),
    ('Chhattisgarh'               , 'Durg'                                   , 'DEMO-CG-DURG-01'),
    ('Chhattisgarh'               , 'Gariyaband'                             , 'DEMO-CG-GARIYABAND-01'),
    ('Chhattisgarh'               , 'Janjgir-Champa'                         , 'DEMO-CG-JANJGIRCHAMPA-01'),
    ('Chhattisgarh'               , 'Jashpur'                                , 'DEMO-CG-JASHPUR-01'),
    ('Chhattisgarh'               , 'Kabirdham (Kawardha)'                   , 'DEMO-CG-KABIRDHAMKAWARDHA-01'),
    ('Chhattisgarh'               , 'Kanker (North Bastar)'                  , 'DEMO-CG-KANKERNORTHBASTAR-01'),
    ('Chhattisgarh'               , 'Kondagaon'                              , 'DEMO-CG-KONDAGAON-01'),
    ('Chhattisgarh'               , 'Korba'                                  , 'DEMO-CG-KORBA-01'),
    ('Chhattisgarh'               , 'Korea (Koriya)'                         , 'DEMO-CG-KOREAKORIYA-01'),
    ('Chhattisgarh'               , 'Mahasamund'                             , 'DEMO-CG-MAHASAMUND-01'),
    ('Chhattisgarh'               , 'Mungeli'                                , 'DEMO-CG-MUNGELI-01'),
    ('Chhattisgarh'               , 'Narayanpur'                             , 'DEMO-CG-NARAYANPUR-01'),
    ('Chhattisgarh'               , 'Raigarh'                                , 'DEMO-CG-RAIGARH-01'),
    ('Chhattisgarh'               , 'Raipur'                                 , 'DEMO-CG-RAIPUR-01'),
    ('Chhattisgarh'               , 'Rajnandgaon'                            , 'DEMO-CG-RAJNANDGAON-01'),
    ('Chhattisgarh'               , 'Sukma'                                  , 'DEMO-CG-SUKMA-01'),
    ('Chhattisgarh'               , 'Surajpur'                               , 'DEMO-CG-SURAJPUR-01'),
    ('Chhattisgarh'               , 'Surguja'                                , 'DEMO-CG-SURGUJA-01'),

    -- Dadra and Nagar Haveli (UT)
    ('Dadra and Nagar Haveli (UT)', 'Dadra & Nagar Haveli'                   , 'DEMO-DN-DADRANAGARHAVELI-01'),

    -- Daman and Diu (UT)
    ('Daman and Diu (UT)'         , 'Daman'                                  , 'DEMO-DD-DAMAN-01'),
    ('Daman and Diu (UT)'         , 'Diu'                                    , 'DEMO-DD-DIU-01'),

    -- Delhi (NCT)
    ('Delhi (NCT)'                , 'Central Delhi'                          , 'DEMO-DL-CENTRALDELHI-01'),
    ('Delhi (NCT)'                , 'East Delhi'                             , 'DEMO-DL-EASTDELHI-01'),
    ('Delhi (NCT)'                , 'New Delhi'                              , 'DEMO-DL-NEWDELHI-01'),
    ('Delhi (NCT)'                , 'North Delhi'                            , 'DEMO-DL-NORTHDELHI-01'),
    ('Delhi (NCT)'                , 'North East Delhi'                       , 'DEMO-DL-NORTHEASTDELHI-01'),
    ('Delhi (NCT)'                , 'North West Delhi'                       , 'DEMO-DL-NORTHWESTDELHI-01'),
    ('Delhi (NCT)'                , 'Shahdara'                               , 'DEMO-DL-SHAHDARA-01'),
    ('Delhi (NCT)'                , 'South Delhi'                            , 'DEMO-DL-SOUTHDELHI-01'),
    ('Delhi (NCT)'                , 'South East Delhi'                       , 'DEMO-DL-SOUTHEASTDELHI-01'),
    ('Delhi (NCT)'                , 'South West Delhi'                       , 'DEMO-DL-SOUTHWESTDELHI-01'),
    ('Delhi (NCT)'                , 'West Delhi'                             , 'DEMO-DL-WESTDELHI-01'),

    -- Goa
    ('Goa'                        , 'North Goa'                              , 'DEMO-GA-NORTHGOA-01'),
    ('Goa'                        , 'South Goa'                              , 'DEMO-GA-SOUTHGOA-01'),

    -- Gujarat
    ('Gujarat'                    , 'Ahmedabad'                              , 'DEMO-GJ-AHMEDABAD-01'),
    ('Gujarat'                    , 'Amreli'                                 , 'DEMO-GJ-AMRELI-01'),
    ('Gujarat'                    , 'Anand'                                  , 'DEMO-GJ-ANAND-01'),
    ('Gujarat'                    , 'Aravalli'                               , 'DEMO-GJ-ARAVALLI-01'),
    ('Gujarat'                    , 'Banaskantha (Palanpur)'                 , 'DEMO-GJ-BANASKANTHAPALANPUR-01'),
    ('Gujarat'                    , 'Bharuch'                                , 'DEMO-GJ-BHARUCH-01'),
    ('Gujarat'                    , 'Bhavnagar'                              , 'DEMO-GJ-BHAVNAGAR-01'),
    ('Gujarat'                    , 'Botad'                                  , 'DEMO-GJ-BOTAD-01'),
    ('Gujarat'                    , 'Chhota Udepur'                          , 'DEMO-GJ-CHHOTAUDEPUR-01'),
    ('Gujarat'                    , 'Dahod'                                  , 'DEMO-GJ-DAHOD-01'),
    ('Gujarat'                    , 'Dangs (Ahwa)'                           , 'DEMO-GJ-DANGSAHWA-01'),
    ('Gujarat'                    , 'Devbhoomi Dwarka'                       , 'DEMO-GJ-DEVBHOOMIDWARKA-01'),
    ('Gujarat'                    , 'Gandhinagar'                            , 'DEMO-GJ-GANDHINAGAR-01'),
    ('Gujarat'                    , 'Gir Somnath'                            , 'DEMO-GJ-GIRSOMNATH-01'),
    ('Gujarat'                    , 'Jamnagar'                               , 'DEMO-GJ-JAMNAGAR-01'),
    ('Gujarat'                    , 'Junagadh'                               , 'DEMO-GJ-JUNAGADH-01'),
    ('Gujarat'                    , 'Kachchh'                                , 'DEMO-GJ-KACHCHH-01'),
    ('Gujarat'                    , 'Kheda (Nadiad)'                         , 'DEMO-GJ-KHEDANADIAD-01'),
    ('Gujarat'                    , 'Mahisagar'                              , 'DEMO-GJ-MAHISAGAR-01'),
    ('Gujarat'                    , 'Mehsana'                                , 'DEMO-GJ-MEHSANA-01'),
    ('Gujarat'                    , 'Morbi'                                  , 'DEMO-GJ-MORBI-01'),
    ('Gujarat'                    , 'Narmada (Rajpipla)'                     , 'DEMO-GJ-NARMADARAJPIPLA-01'),
    ('Gujarat'                    , 'Navsari'                                , 'DEMO-GJ-NAVSARI-01'),
    ('Gujarat'                    , 'Panchmahal (Godhra)'                    , 'DEMO-GJ-PANCHMAHALGODHRA-01'),
    ('Gujarat'                    , 'Patan'                                  , 'DEMO-GJ-PATAN-01'),
    ('Gujarat'                    , 'Porbandar'                              , 'DEMO-GJ-PORBANDAR-01'),
    ('Gujarat'                    , 'Rajkot'                                 , 'DEMO-GJ-RAJKOT-01'),
    ('Gujarat'                    , 'Sabarkantha (Himmatnagar)'              , 'DEMO-GJ-SABARKANTHAHIMMATNAGAR-01'),
    ('Gujarat'                    , 'Surat'                                  , 'DEMO-GJ-SURAT-01'),
    ('Gujarat'                    , 'Surendranagar'                          , 'DEMO-GJ-SURENDRANAGAR-01'),
    ('Gujarat'                    , 'Tapi (Vyara)'                           , 'DEMO-GJ-TAPIVYARA-01'),
    ('Gujarat'                    , 'Vadodara'                               , 'DEMO-GJ-VADODARA-01'),
    ('Gujarat'                    , 'Valsad'                                 , 'DEMO-GJ-VALSAD-01'),

    -- Haryana
    ('Haryana'                    , 'Ambala'                                 , 'DEMO-HR-AMBALA-01'),
    ('Haryana'                    , 'Bhiwani'                                , 'DEMO-HR-BHIWANI-01'),
    ('Haryana'                    , 'Charkhi Dadri'                          , 'DEMO-HR-CHARKHIDADRI-01'),
    ('Haryana'                    , 'Faridabad'                              , 'DEMO-HR-FARIDABAD-01'),
    ('Haryana'                    , 'Fatehabad'                              , 'DEMO-HR-FATEHABAD-01'),
    ('Haryana'                    , 'Gurgaon'                                , 'DEMO-HR-GURGAON-01'),
    ('Haryana'                    , 'Hisar'                                  , 'DEMO-HR-HISAR-01'),
    ('Haryana'                    , 'Jhajjar'                                , 'DEMO-HR-JHAJJAR-01'),
    ('Haryana'                    , 'Jind'                                   , 'DEMO-HR-JIND-01'),
    ('Haryana'                    , 'Kaithal'                                , 'DEMO-HR-KAITHAL-01'),
    ('Haryana'                    , 'Karnal'                                 , 'DEMO-HR-KARNAL-01'),
    ('Haryana'                    , 'Kurukshetra'                            , 'DEMO-HR-KURUKSHETRA-01'),
    ('Haryana'                    , 'Mahendragarh'                           , 'DEMO-HR-MAHENDRAGARH-01'),
    ('Haryana'                    , 'Mewat'                                  , 'DEMO-HR-MEWAT-01'),
    ('Haryana'                    , 'Palwal'                                 , 'DEMO-HR-PALWAL-01'),
    ('Haryana'                    , 'Panchkula'                              , 'DEMO-HR-PANCHKULA-01'),
    ('Haryana'                    , 'Panipat'                                , 'DEMO-HR-PANIPAT-01'),
    ('Haryana'                    , 'Rewari'                                 , 'DEMO-HR-REWARI-01'),
    ('Haryana'                    , 'Rohtak'                                 , 'DEMO-HR-ROHTAK-01'),
    ('Haryana'                    , 'Sirsa'                                  , 'DEMO-HR-SIRSA-01'),
    ('Haryana'                    , 'Sonipat'                                , 'DEMO-HR-SONIPAT-01'),
    ('Haryana'                    , 'Yamunanagar'                            , 'DEMO-HR-YAMUNANAGAR-01'),

    -- Himachal Pradesh
    ('Himachal Pradesh'           , 'Bilaspur'                               , 'DEMO-HP-BILASPUR-01'),
    ('Himachal Pradesh'           , 'Chamba'                                 , 'DEMO-HP-CHAMBA-01'),
    ('Himachal Pradesh'           , 'Hamirpur'                               , 'DEMO-HP-HAMIRPUR-01'),
    ('Himachal Pradesh'           , 'Kangra'                                 , 'DEMO-HP-KANGRA-01'),
    ('Himachal Pradesh'           , 'Kinnaur'                                , 'DEMO-HP-KINNAUR-01'),
    ('Himachal Pradesh'           , 'Kullu'                                  , 'DEMO-HP-KULLU-01'),
    ('Himachal Pradesh'           , 'Lahaul & Spiti'                         , 'DEMO-HP-LAHAULSPITI-01'),
    ('Himachal Pradesh'           , 'Mandi'                                  , 'DEMO-HP-MANDI-01'),
    ('Himachal Pradesh'           , 'Shimla'                                 , 'DEMO-HP-SHIMLA-01'),
    ('Himachal Pradesh'           , 'Sirmaur (Sirmour)'                      , 'DEMO-HP-SIRMAURSIRMOUR-01'),
    ('Himachal Pradesh'           , 'Solan'                                  , 'DEMO-HP-SOLAN-01'),
    ('Himachal Pradesh'           , 'Una'                                    , 'DEMO-HP-UNA-01'),

    -- Jammu and Kashmir
    ('Jammu and Kashmir'          , 'Anantnag'                               , 'DEMO-JK-ANANTNAG-01'),
    ('Jammu and Kashmir'          , 'Bandipore'                              , 'DEMO-JK-BANDIPORE-01'),
    ('Jammu and Kashmir'          , 'Baramulla'                              , 'DEMO-JK-BARAMULLA-01'),
    ('Jammu and Kashmir'          , 'Budgam'                                 , 'DEMO-JK-BUDGAM-01'),
    ('Jammu and Kashmir'          , 'Doda'                                   , 'DEMO-JK-DODA-01'),
    ('Jammu and Kashmir'          , 'Ganderbal'                              , 'DEMO-JK-GANDERBAL-01'),
    ('Jammu and Kashmir'          , 'Jammu'                                  , 'DEMO-JK-JAMMU-01'),
    ('Jammu and Kashmir'          , 'Kargil'                                 , 'DEMO-JK-KARGIL-01'),
    ('Jammu and Kashmir'          , 'Kathua'                                 , 'DEMO-JK-KATHUA-01'),
    ('Jammu and Kashmir'          , 'Kishtwar'                               , 'DEMO-JK-KISHTWAR-01'),
    ('Jammu and Kashmir'          , 'Kulgam'                                 , 'DEMO-JK-KULGAM-01'),
    ('Jammu and Kashmir'          , 'Kupwara'                                , 'DEMO-JK-KUPWARA-01'),
    ('Jammu and Kashmir'          , 'Leh'                                    , 'DEMO-JK-LEH-01'),
    ('Jammu and Kashmir'          , 'Poonch'                                 , 'DEMO-JK-POONCH-01'),
    ('Jammu and Kashmir'          , 'Pulwama'                                , 'DEMO-JK-PULWAMA-01'),
    ('Jammu and Kashmir'          , 'Rajouri'                                , 'DEMO-JK-RAJOURI-01'),
    ('Jammu and Kashmir'          , 'Ramban'                                 , 'DEMO-JK-RAMBAN-01'),
    ('Jammu and Kashmir'          , 'Reasi'                                  , 'DEMO-JK-REASI-01'),
    ('Jammu and Kashmir'          , 'Samba'                                  , 'DEMO-JK-SAMBA-01'),
    ('Jammu and Kashmir'          , 'Shopian'                                , 'DEMO-JK-SHOPIAN-01'),
    ('Jammu and Kashmir'          , 'Srinagar'                               , 'DEMO-JK-SRINAGAR-01'),
    ('Jammu and Kashmir'          , 'Udhampur'                               , 'DEMO-JK-UDHAMPUR-01'),

    -- Jharkhand
    ('Jharkhand'                  , 'Bokaro'                                 , 'DEMO-JH-BOKARO-01'),
    ('Jharkhand'                  , 'Chatra'                                 , 'DEMO-JH-CHATRA-01'),
    ('Jharkhand'                  , 'Deoghar'                                , 'DEMO-JH-DEOGHAR-01'),
    ('Jharkhand'                  , 'Dhanbad'                                , 'DEMO-JH-DHANBAD-01'),
    ('Jharkhand'                  , 'Dumka'                                  , 'DEMO-JH-DUMKA-01'),
    ('Jharkhand'                  , 'East Singhbhum'                         , 'DEMO-JH-EASTSINGHBHUM-01'),
    ('Jharkhand'                  , 'Garhwa'                                 , 'DEMO-JH-GARHWA-01'),
    ('Jharkhand'                  , 'Giridih'                                , 'DEMO-JH-GIRIDIH-01'),
    ('Jharkhand'                  , 'Godda'                                  , 'DEMO-JH-GODDA-01'),
    ('Jharkhand'                  , 'Gumla'                                  , 'DEMO-JH-GUMLA-01'),
    ('Jharkhand'                  , 'Hazaribag'                              , 'DEMO-JH-HAZARIBAG-01'),
    ('Jharkhand'                  , 'Jamtara'                                , 'DEMO-JH-JAMTARA-01'),
    ('Jharkhand'                  , 'Khunti'                                 , 'DEMO-JH-KHUNTI-01'),
    ('Jharkhand'                  , 'Koderma'                                , 'DEMO-JH-KODERMA-01'),
    ('Jharkhand'                  , 'Latehar'                                , 'DEMO-JH-LATEHAR-01'),
    ('Jharkhand'                  , 'Lohardaga'                              , 'DEMO-JH-LOHARDAGA-01'),
    ('Jharkhand'                  , 'Pakur'                                  , 'DEMO-JH-PAKUR-01'),
    ('Jharkhand'                  , 'Palamu'                                 , 'DEMO-JH-PALAMU-01'),
    ('Jharkhand'                  , 'Ramgarh'                                , 'DEMO-JH-RAMGARH-01'),
    ('Jharkhand'                  , 'Ranchi'                                 , 'DEMO-JH-RANCHI-01'),
    ('Jharkhand'                  , 'Sahibganj'                              , 'DEMO-JH-SAHIBGANJ-01'),
    ('Jharkhand'                  , 'Seraikela-Kharsawan'                    , 'DEMO-JH-SERAIKELAKHARSAWAN-01'),
    ('Jharkhand'                  , 'Simdega'                                , 'DEMO-JH-SIMDEGA-01'),
    ('Jharkhand'                  , 'West Singhbhum'                         , 'DEMO-JH-WESTSINGHBHUM-01'),

    -- Karnataka
    ('Karnataka'                  , 'Bagalkot'                               , 'DEMO-KA-BAGALKOT-01'),
    ('Karnataka'                  , 'Ballari (Bellary)'                      , 'DEMO-KA-BALLARIBELLARY-01'),
    ('Karnataka'                  , 'Belagavi (Belgaum)'                     , 'DEMO-KA-BELAGAVIBELGAUM-01'),
    ('Karnataka'                  , 'Bengaluru (Bangalore) Rural'            , 'DEMO-KA-BENGALURUBANGALORERURAL-01'),
    ('Karnataka'                  , 'Bengaluru (Bangalore) Urban'            , 'DEMO-KA-BENGALURUBANGALOREURBAN-01'),
    ('Karnataka'                  , 'Bidar'                                  , 'DEMO-KA-BIDAR-01'),
    ('Karnataka'                  , 'Chamarajanagar'                         , 'DEMO-KA-CHAMARAJANAGAR-01'),
    ('Karnataka'                  , 'Chikballapur'                           , 'DEMO-KA-CHIKBALLAPUR-01'),
    ('Karnataka'                  , 'Chikkamagaluru (Chikmagalur)'           , 'DEMO-KA-CHIKKAMAGALURUCHIKMAGALUR-01'),
    ('Karnataka'                  , 'Chitradurga'                            , 'DEMO-KA-CHITRADURGA-01'),
    ('Karnataka'                  , 'Dakshina Kannada'                       , 'DEMO-KA-DAKSHINAKANNADA-01'),
    ('Karnataka'                  , 'Davangere'                              , 'DEMO-KA-DAVANGERE-01'),
    ('Karnataka'                  , 'Dharwad'                                , 'DEMO-KA-DHARWAD-01'),
    ('Karnataka'                  , 'Gadag'                                  , 'DEMO-KA-GADAG-01'),
    ('Karnataka'                  , 'Hassan'                                 , 'DEMO-KA-HASSAN-01'),
    ('Karnataka'                  , 'Haveri'                                 , 'DEMO-KA-HAVERI-01'),
    ('Karnataka'                  , 'Kalaburagi (Gulbarga)'                  , 'DEMO-KA-KALABURAGIGULBARGA-01'),
    ('Karnataka'                  , 'Kodagu'                                 , 'DEMO-KA-KODAGU-01'),
    ('Karnataka'                  , 'Kolar'                                  , 'DEMO-KA-KOLAR-01'),
    ('Karnataka'                  , 'Koppal'                                 , 'DEMO-KA-KOPPAL-01'),
    ('Karnataka'                  , 'Mandya'                                 , 'DEMO-KA-MANDYA-01'),
    ('Karnataka'                  , 'Mysuru (Mysore)'                        , 'DEMO-KA-MYSURUMYSORE-01'),
    ('Karnataka'                  , 'Raichur'                                , 'DEMO-KA-RAICHUR-01'),
    ('Karnataka'                  , 'Ramanagara'                             , 'DEMO-KA-RAMANAGARA-01'),
    ('Karnataka'                  , 'Shivamogga (Shimoga)'                   , 'DEMO-KA-SHIVAMOGGASHIMOGA-01'),
    ('Karnataka'                  , 'Tumakuru (Tumkur)'                      , 'DEMO-KA-TUMAKURUTUMKUR-01'),
    ('Karnataka'                  , 'Udupi'                                  , 'DEMO-KA-UDUPI-01'),
    ('Karnataka'                  , 'Uttara Kannada (Karwar)'                , 'DEMO-KA-UTTARAKANNADAKARWAR-01'),
    ('Karnataka'                  , 'Vijayapura (Bijapur)'                   , 'DEMO-KA-VIJAYAPURABIJAPUR-01'),
    ('Karnataka'                  , 'Yadgir'                                 , 'DEMO-KA-YADGIR-01'),

    -- Kerala
    ('Kerala'                     , 'Alappuzha'                              , 'DEMO-KL-ALAPPUZHA-01'),
    ('Kerala'                     , 'Ernakulam'                              , 'DEMO-KL-ERNAKULAM-01'),
    ('Kerala'                     , 'Idukki'                                 , 'DEMO-KL-IDUKKI-01'),
    ('Kerala'                     , 'Kannur'                                 , 'DEMO-KL-KANNUR-01'),
    ('Kerala'                     , 'Kasaragod'                              , 'DEMO-KL-KASARAGOD-01'),
    ('Kerala'                     , 'Kollam'                                 , 'DEMO-KL-KOLLAM-01'),
    ('Kerala'                     , 'Kottayam'                               , 'DEMO-KL-KOTTAYAM-01'),
    ('Kerala'                     , 'Kozhikode'                              , 'DEMO-KL-KOZHIKODE-01'),
    ('Kerala'                     , 'Malappuram'                             , 'DEMO-KL-MALAPPURAM-01'),
    ('Kerala'                     , 'Palakkad'                               , 'DEMO-KL-PALAKKAD-01'),
    ('Kerala'                     , 'Pathanamthitta'                         , 'DEMO-KL-PATHANAMTHITTA-01'),
    ('Kerala'                     , 'Thiruvananthapuram'                     , 'DEMO-KL-THIRUVANANTHAPURAM-01'),
    ('Kerala'                     , 'Thrissur'                               , 'DEMO-KL-THRISSUR-01'),
    ('Kerala'                     , 'Wayanad'                                , 'DEMO-KL-WAYANAD-01'),

    -- Lakshadweep (UT)
    ('Lakshadweep (UT)'           , 'Agatti'                                 , 'DEMO-LD-AGATTI-01'),
    ('Lakshadweep (UT)'           , 'Amini'                                  , 'DEMO-LD-AMINI-01'),
    ('Lakshadweep (UT)'           , 'Androth'                                , 'DEMO-LD-ANDROTH-01'),
    ('Lakshadweep (UT)'           , 'Bithra'                                 , 'DEMO-LD-BITHRA-01'),
    ('Lakshadweep (UT)'           , 'Chethlath'                              , 'DEMO-LD-CHETHLATH-01'),
    ('Lakshadweep (UT)'           , 'Kavaratti'                              , 'DEMO-LD-KAVARATTI-01'),
    ('Lakshadweep (UT)'           , 'Kadmath'                                , 'DEMO-LD-KADMATH-01'),
    ('Lakshadweep (UT)'           , 'Kalpeni'                                , 'DEMO-LD-KALPENI-01'),
    ('Lakshadweep (UT)'           , 'Kilthan'                                , 'DEMO-LD-KILTHAN-01'),
    ('Lakshadweep (UT)'           , 'Minicoy'                                , 'DEMO-LD-MINICOY-01'),

    -- Madhya Pradesh
    ('Madhya Pradesh'             , 'Agar Malwa'                             , 'DEMO-MP-AGARMALWA-01'),
    ('Madhya Pradesh'             , 'Alirajpur'                              , 'DEMO-MP-ALIRAJPUR-01'),
    ('Madhya Pradesh'             , 'Anuppur'                                , 'DEMO-MP-ANUPPUR-01'),
    ('Madhya Pradesh'             , 'Ashoknagar'                             , 'DEMO-MP-ASHOKNAGAR-01'),
    ('Madhya Pradesh'             , 'Balaghat'                               , 'DEMO-MP-BALAGHAT-01'),
    ('Madhya Pradesh'             , 'Barwani'                                , 'DEMO-MP-BARWANI-01'),
    ('Madhya Pradesh'             , 'Betul'                                  , 'DEMO-MP-BETUL-01'),
    ('Madhya Pradesh'             , 'Bhind'                                  , 'DEMO-MP-BHIND-01'),
    ('Madhya Pradesh'             , 'Bhopal'                                 , 'DEMO-MP-BHOPAL-01'),
    ('Madhya Pradesh'             , 'Burhanpur'                              , 'DEMO-MP-BURHANPUR-01'),
    ('Madhya Pradesh'             , 'Chhatarpur'                             , 'DEMO-MP-CHHATARPUR-01'),
    ('Madhya Pradesh'             , 'Chhindwara'                             , 'DEMO-MP-CHHINDWARA-01'),
    ('Madhya Pradesh'             , 'Damoh'                                  , 'DEMO-MP-DAMOH-01'),
    ('Madhya Pradesh'             , 'Datia'                                  , 'DEMO-MP-DATIA-01'),
    ('Madhya Pradesh'             , 'Dewas'                                  , 'DEMO-MP-DEWAS-01'),
    ('Madhya Pradesh'             , 'Dhar'                                   , 'DEMO-MP-DHAR-01'),
    ('Madhya Pradesh'             , 'Dindori'                                , 'DEMO-MP-DINDORI-01'),
    ('Madhya Pradesh'             , 'Guna'                                   , 'DEMO-MP-GUNA-01'),
    ('Madhya Pradesh'             , 'Gwalior'                                , 'DEMO-MP-GWALIOR-01'),
    ('Madhya Pradesh'             , 'Harda'                                  , 'DEMO-MP-HARDA-01'),
    ('Madhya Pradesh'             , 'Hoshangabad'                            , 'DEMO-MP-HOSHANGABAD-01'),
    ('Madhya Pradesh'             , 'Indore'                                 , 'DEMO-MP-INDORE-01'),
    ('Madhya Pradesh'             , 'Jabalpur'                               , 'DEMO-MP-JABALPUR-01'),
    ('Madhya Pradesh'             , 'Jhabua'                                 , 'DEMO-MP-JHABUA-01'),
    ('Madhya Pradesh'             , 'Katni'                                  , 'DEMO-MP-KATNI-01'),
    ('Madhya Pradesh'             , 'Khandwa'                                , 'DEMO-MP-KHANDWA-01'),
    ('Madhya Pradesh'             , 'Khargone'                               , 'DEMO-MP-KHARGONE-01'),
    ('Madhya Pradesh'             , 'Mandla'                                 , 'DEMO-MP-MANDLA-01'),
    ('Madhya Pradesh'             , 'Mandsaur'                               , 'DEMO-MP-MANDSAUR-01'),
    ('Madhya Pradesh'             , 'Morena'                                 , 'DEMO-MP-MORENA-01'),
    ('Madhya Pradesh'             , 'Narsinghpur'                            , 'DEMO-MP-NARSINGHPUR-01'),
    ('Madhya Pradesh'             , 'Neemuch'                                , 'DEMO-MP-NEEMUCH-01'),
    ('Madhya Pradesh'             , 'Panna'                                  , 'DEMO-MP-PANNA-01'),
    ('Madhya Pradesh'             , 'Raisen'                                 , 'DEMO-MP-RAISEN-01'),
    ('Madhya Pradesh'             , 'Rajgarh'                                , 'DEMO-MP-RAJGARH-01'),
    ('Madhya Pradesh'             , 'Ratlam'                                 , 'DEMO-MP-RATLAM-01'),
    ('Madhya Pradesh'             , 'Rewa'                                   , 'DEMO-MP-REWA-01'),
    ('Madhya Pradesh'             , 'Sagar'                                  , 'DEMO-MP-SAGAR-01'),
    ('Madhya Pradesh'             , 'Satna'                                  , 'DEMO-MP-SATNA-01'),
    ('Madhya Pradesh'             , 'Sehore'                                 , 'DEMO-MP-SEHORE-01'),
    ('Madhya Pradesh'             , 'Seoni'                                  , 'DEMO-MP-SEONI-01'),
    ('Madhya Pradesh'             , 'Shahdol'                                , 'DEMO-MP-SHAHDOL-01'),
    ('Madhya Pradesh'             , 'Shajapur'                               , 'DEMO-MP-SHAJAPUR-01'),
    ('Madhya Pradesh'             , 'Sheopur'                                , 'DEMO-MP-SHEOPUR-01'),
    ('Madhya Pradesh'             , 'Shivpuri'                               , 'DEMO-MP-SHIVPURI-01'),
    ('Madhya Pradesh'             , 'Sidhi'                                  , 'DEMO-MP-SIDHI-01'),
    ('Madhya Pradesh'             , 'Singrauli'                              , 'DEMO-MP-SINGRAULI-01'),
    ('Madhya Pradesh'             , 'Tikamgarh'                              , 'DEMO-MP-TIKAMGARH-01'),
    ('Madhya Pradesh'             , 'Ujjain'                                 , 'DEMO-MP-UJJAIN-01'),
    ('Madhya Pradesh'             , 'Umaria'                                 , 'DEMO-MP-UMARIA-01'),
    ('Madhya Pradesh'             , 'Vidisha'                                , 'DEMO-MP-VIDISHA-01'),

    -- Maharashtra
    ('Maharashtra'                , 'Ahmednagar'                             , 'DEMO-MH-AHMEDNAGAR-01'),
    ('Maharashtra'                , 'Akola'                                  , 'DEMO-MH-AKOLA-01'),
    ('Maharashtra'                , 'Amravati'                               , 'DEMO-MH-AMRAVATI-01'),
    ('Maharashtra'                , 'Aurangabad'                             , 'DEMO-MH-AURANGABAD-01'),
    ('Maharashtra'                , 'Beed'                                   , 'DEMO-MH-BEED-01'),
    ('Maharashtra'                , 'Bhandara'                               , 'DEMO-MH-BHANDARA-01'),
    ('Maharashtra'                , 'Buldhana'                               , 'DEMO-MH-BULDHANA-01'),
    ('Maharashtra'                , 'Chandrapur'                             , 'DEMO-MH-CHANDRAPUR-01'),
    ('Maharashtra'                , 'Dhule'                                  , 'DEMO-MH-DHULE-01'),
    ('Maharashtra'                , 'Gadchiroli'                             , 'DEMO-MH-GADCHIROLI-01'),
    ('Maharashtra'                , 'Gondia'                                 , 'DEMO-MH-GONDIA-01'),
    ('Maharashtra'                , 'Hingoli'                                , 'DEMO-MH-HINGOLI-01'),
    ('Maharashtra'                , 'Jalgaon'                                , 'DEMO-MH-JALGAON-01'),
    ('Maharashtra'                , 'Jalna'                                  , 'DEMO-MH-JALNA-01'),
    ('Maharashtra'                , 'Kolhapur'                               , 'DEMO-MH-KOLHAPUR-01'),
    ('Maharashtra'                , 'Latur'                                  , 'DEMO-MH-LATUR-01'),
    ('Maharashtra'                , 'Mumbai City'                            , 'DEMO-MH-MUMBAICITY-01'),
    ('Maharashtra'                , 'Mumbai Suburban'                        , 'DEMO-MH-MUMBAISUBURBAN-01'),
    ('Maharashtra'                , 'Nagpur'                                 , 'DEMO-MH-NAGPUR-01'),
    ('Maharashtra'                , 'Nanded'                                 , 'DEMO-MH-NANDED-01'),
    ('Maharashtra'                , 'Nandurbar'                              , 'DEMO-MH-NANDURBAR-01'),
    ('Maharashtra'                , 'Nashik'                                 , 'DEMO-MH-NASHIK-01'),
    ('Maharashtra'                , 'Osmanabad'                              , 'DEMO-MH-OSMANABAD-01'),
    ('Maharashtra'                , 'Palghar'                                , 'DEMO-MH-PALGHAR-01'),
    ('Maharashtra'                , 'Parbhani'                               , 'DEMO-MH-PARBHANI-01'),
    ('Maharashtra'                , 'Pune'                                   , 'DEMO-MH-PUNE-01'),
    ('Maharashtra'                , 'Raigad'                                 , 'DEMO-MH-RAIGAD-01'),
    ('Maharashtra'                , 'Ratnagiri'                              , 'DEMO-MH-RATNAGIRI-01'),
    ('Maharashtra'                , 'Sangli'                                 , 'DEMO-MH-SANGLI-01'),
    ('Maharashtra'                , 'Satara'                                 , 'DEMO-MH-SATARA-01'),
    ('Maharashtra'                , 'Sindhudurg'                             , 'DEMO-MH-SINDHUDURG-01'),
    ('Maharashtra'                , 'Solapur'                                , 'DEMO-MH-SOLAPUR-01'),
    ('Maharashtra'                , 'Thane'                                  , 'DEMO-MH-THANE-01'),
    ('Maharashtra'                , 'Wardha'                                 , 'DEMO-MH-WARDHA-01'),
    ('Maharashtra'                , 'Washim'                                 , 'DEMO-MH-WASHIM-01'),
    ('Maharashtra'                , 'Yavatmal'                               , 'DEMO-MH-YAVATMAL-01'),

    -- Manipur
    ('Manipur'                    , 'Bishnupur'                              , 'DEMO-MN-BISHNUPUR-01'),
    ('Manipur'                    , 'Chandel'                                , 'DEMO-MN-CHANDEL-01'),
    ('Manipur'                    , 'Churachandpur'                          , 'DEMO-MN-CHURACHANDPUR-01'),
    ('Manipur'                    , 'Imphal East'                            , 'DEMO-MN-IMPHALEAST-01'),
    ('Manipur'                    , 'Imphal West'                            , 'DEMO-MN-IMPHALWEST-01'),
    ('Manipur'                    , 'Jiribam'                                , 'DEMO-MN-JIRIBAM-01'),
    ('Manipur'                    , 'Kakching'                               , 'DEMO-MN-KAKCHING-01'),
    ('Manipur'                    , 'Kamjong'                                , 'DEMO-MN-KAMJONG-01'),
    ('Manipur'                    , 'Kangpokpi'                              , 'DEMO-MN-KANGPOKPI-01'),
    ('Manipur'                    , 'Noney'                                  , 'DEMO-MN-NONEY-01'),
    ('Manipur'                    , 'Pherzawl'                               , 'DEMO-MN-PHERZAWL-01'),
    ('Manipur'                    , 'Senapati'                               , 'DEMO-MN-SENAPATI-01'),
    ('Manipur'                    , 'Tamenglong'                             , 'DEMO-MN-TAMENGLONG-01'),
    ('Manipur'                    , 'Tengnoupal'                             , 'DEMO-MN-TENGNOUPAL-01'),
    ('Manipur'                    , 'Thoubal'                                , 'DEMO-MN-THOUBAL-01'),
    ('Manipur'                    , 'Ukhrul'                                 , 'DEMO-MN-UKHRUL-01'),

    -- Meghalaya
    ('Meghalaya'                  , 'East Garo Hills'                        , 'DEMO-ML-EASTGAROHILLS-01'),
    ('Meghalaya'                  , 'East Jaintia Hills'                     , 'DEMO-ML-EASTJAINTIAHILLS-01'),
    ('Meghalaya'                  , 'East Khasi Hills'                       , 'DEMO-ML-EASTKHASIHILLS-01'),
    ('Meghalaya'                  , 'North Garo Hills'                       , 'DEMO-ML-NORTHGAROHILLS-01'),
    ('Meghalaya'                  , 'Ri Bhoi'                                , 'DEMO-ML-RIBHOI-01'),
    ('Meghalaya'                  , 'South Garo Hills'                       , 'DEMO-ML-SOUTHGAROHILLS-01'),
    ('Meghalaya'                  , 'South West Garo Hills'                  , 'DEMO-ML-SOUTHWESTGAROHILLS-01'),
    ('Meghalaya'                  , 'South West Khasi Hills'                 , 'DEMO-ML-SOUTHWESTKHASIHILLS-01'),
    ('Meghalaya'                  , 'West Garo Hills'                        , 'DEMO-ML-WESTGAROHILLS-01'),
    ('Meghalaya'                  , 'West Jaintia Hills'                     , 'DEMO-ML-WESTJAINTIAHILLS-01'),
    ('Meghalaya'                  , 'West Khasi Hills'                       , 'DEMO-ML-WESTKHASIHILLS-01'),

    -- Mizoram
    ('Mizoram'                    , 'Aizawl'                                 , 'DEMO-MZ-AIZAWL-01'),
    ('Mizoram'                    , 'Champhai'                               , 'DEMO-MZ-CHAMPHAI-01'),
    ('Mizoram'                    , 'Kolasib'                                , 'DEMO-MZ-KOLASIB-01'),
    ('Mizoram'                    , 'Lawngtlai'                              , 'DEMO-MZ-LAWNGTLAI-01'),
    ('Mizoram'                    , 'Lunglei'                                , 'DEMO-MZ-LUNGLEI-01'),
    ('Mizoram'                    , 'Mamit'                                  , 'DEMO-MZ-MAMIT-01'),
    ('Mizoram'                    , 'Saiha'                                  , 'DEMO-MZ-SAIHA-01'),
    ('Mizoram'                    , 'Serchhip'                               , 'DEMO-MZ-SERCHHIP-01'),

    -- Nagaland
    ('Nagaland'                   , 'Dimapur'                                , 'DEMO-NL-DIMAPUR-01'),
    ('Nagaland'                   , 'Kiphire'                                , 'DEMO-NL-KIPHIRE-01'),
    ('Nagaland'                   , 'Kohima'                                 , 'DEMO-NL-KOHIMA-01'),
    ('Nagaland'                   , 'Longleng'                               , 'DEMO-NL-LONGLENG-01'),
    ('Nagaland'                   , 'Mokokchung'                             , 'DEMO-NL-MOKOKCHUNG-01'),
    ('Nagaland'                   , 'Mon'                                    , 'DEMO-NL-MON-01'),
    ('Nagaland'                   , 'Peren'                                  , 'DEMO-NL-PEREN-01'),
    ('Nagaland'                   , 'Phek'                                   , 'DEMO-NL-PHEK-01'),
    ('Nagaland'                   , 'Tuensang'                               , 'DEMO-NL-TUENSANG-01'),
    ('Nagaland'                   , 'Wokha'                                  , 'DEMO-NL-WOKHA-01'),
    ('Nagaland'                   , 'Zunheboto'                              , 'DEMO-NL-ZUNHEBOTO-01'),

    -- Odisha
    ('Odisha'                     , 'Angul'                                  , 'DEMO-OD-ANGUL-01'),
    ('Odisha'                     , 'Balangir'                               , 'DEMO-OD-BALANGIR-01'),
    ('Odisha'                     , 'Balasore'                               , 'DEMO-OD-BALASORE-01'),
    ('Odisha'                     , 'Bargarh'                                , 'DEMO-OD-BARGARH-01'),
    ('Odisha'                     , 'Bhadrak'                                , 'DEMO-OD-BHADRAK-01'),
    ('Odisha'                     , 'Boudh'                                  , 'DEMO-OD-BOUDH-01'),
    ('Odisha'                     , 'Cuttack'                                , 'DEMO-OD-CUTTACK-01'),
    ('Odisha'                     , 'Deogarh'                                , 'DEMO-OD-DEOGARH-01'),
    ('Odisha'                     , 'Dhenkanal'                              , 'DEMO-OD-DHENKANAL-01'),
    ('Odisha'                     , 'Gajapati'                               , 'DEMO-OD-GAJAPATI-01'),
    ('Odisha'                     , 'Ganjam'                                 , 'DEMO-OD-GANJAM-01'),
    ('Odisha'                     , 'Jagatsinghapur'                         , 'DEMO-OD-JAGATSINGHAPUR-01'),
    ('Odisha'                     , 'Jajpur'                                 , 'DEMO-OD-JAJPUR-01'),
    ('Odisha'                     , 'Jharsuguda'                             , 'DEMO-OD-JHARSUGUDA-01'),
    ('Odisha'                     , 'Kalahandi'                              , 'DEMO-OD-KALAHANDI-01'),
    ('Odisha'                     , 'Kandhamal'                              , 'DEMO-OD-KANDHAMAL-01'),
    ('Odisha'                     , 'Kendrapara'                             , 'DEMO-OD-KENDRAPARA-01'),
    ('Odisha'                     , 'Kendujhar (Keonjhar)'                   , 'DEMO-OD-KENDUJHARKEONJHAR-01'),
    ('Odisha'                     , 'Khordha'                                , 'DEMO-OD-KHORDHA-01'),
    ('Odisha'                     , 'Koraput'                                , 'DEMO-OD-KORAPUT-01'),
    ('Odisha'                     , 'Malkangiri'                             , 'DEMO-OD-MALKANGIRI-01'),
    ('Odisha'                     , 'Mayurbhanj'                             , 'DEMO-OD-MAYURBHANJ-01'),
    ('Odisha'                     , 'Nabarangpur'                            , 'DEMO-OD-NABARANGPUR-01'),
    ('Odisha'                     , 'Nayagarh'                               , 'DEMO-OD-NAYAGARH-01'),
    ('Odisha'                     , 'Nuapada'                                , 'DEMO-OD-NUAPADA-01'),
    ('Odisha'                     , 'Puri'                                   , 'DEMO-OD-PURI-01'),
    ('Odisha'                     , 'Rayagada'                               , 'DEMO-OD-RAYAGADA-01'),
    ('Odisha'                     , 'Sambalpur'                              , 'DEMO-OD-SAMBALPUR-01'),
    ('Odisha'                     , 'Sonepur'                                , 'DEMO-OD-SONEPUR-01'),
    ('Odisha'                     , 'Sundargarh'                             , 'DEMO-OD-SUNDARGARH-01'),

    -- Puducherry (UT)
    ('Puducherry (UT)'            , 'Karaikal'                               , 'DEMO-PY-KARAIKAL-01'),
    ('Puducherry (UT)'            , 'Mahe'                                   , 'DEMO-PY-MAHE-01'),
    ('Puducherry (UT)'            , 'Pondicherry'                            , 'DEMO-PY-PONDICHERRY-01'),
    ('Puducherry (UT)'            , 'Yanam'                                  , 'DEMO-PY-YANAM-01'),

    -- Punjab
    ('Punjab'                     , 'Amritsar'                               , 'DEMO-PB-AMRITSAR-01'),
    ('Punjab'                     , 'Barnala'                                , 'DEMO-PB-BARNALA-01'),
    ('Punjab'                     , 'Bathinda'                               , 'DEMO-PB-BATHINDA-01'),
    ('Punjab'                     , 'Faridkot'                               , 'DEMO-PB-FARIDKOT-01'),
    ('Punjab'                     , 'Fatehgarh Sahib'                        , 'DEMO-PB-FATEHGARHSAHIB-01'),
    ('Punjab'                     , 'Fazilka'                                , 'DEMO-PB-FAZILKA-01'),
    ('Punjab'                     , 'Ferozepur'                              , 'DEMO-PB-FEROZEPUR-01'),
    ('Punjab'                     , 'Gurdaspur'                              , 'DEMO-PB-GURDASPUR-01'),
    ('Punjab'                     , 'Hoshiarpur'                             , 'DEMO-PB-HOSHIARPUR-01'),
    ('Punjab'                     , 'Jalandhar'                              , 'DEMO-PB-JALANDHAR-01'),
    ('Punjab'                     , 'Kapurthala'                             , 'DEMO-PB-KAPURTHALA-01'),
    ('Punjab'                     , 'Ludhiana'                               , 'DEMO-PB-LUDHIANA-01'),
    ('Punjab'                     , 'Mansa'                                  , 'DEMO-PB-MANSA-01'),
    ('Punjab'                     , 'Moga'                                   , 'DEMO-PB-MOGA-01'),
    ('Punjab'                     , 'Muktsar'                                , 'DEMO-PB-MUKTSAR-01'),
    ('Punjab'                     , 'Nawanshahr (Shahid Bhagat Singh Nagar)' , 'DEMO-PB-NAWANSHAHRSHAHIDBHAGATSINGHNAGAR-01'),
    ('Punjab'                     , 'Pathankot'                              , 'DEMO-PB-PATHANKOT-01'),
    ('Punjab'                     , 'Patiala'                                , 'DEMO-PB-PATIALA-01'),
    ('Punjab'                     , 'Rupnagar'                               , 'DEMO-PB-RUPNAGAR-01'),
    ('Punjab'                     , 'Sahibzada Ajit Singh Nagar (Mohali)'    , 'DEMO-PB-SAHIBZADAAJITSINGHNAGARMOHALI-01'),
    ('Punjab'                     , 'Sangrur'                                , 'DEMO-PB-SANGRUR-01'),
    ('Punjab'                     , 'Tarn Taran'                             , 'DEMO-PB-TARNTARAN-01'),

    -- Rajasthan
    ('Rajasthan'                  , 'Ajmer'                                  , 'DEMO-RJ-AJMER-01'),
    ('Rajasthan'                  , 'Alwar'                                  , 'DEMO-RJ-ALWAR-01'),
    ('Rajasthan'                  , 'Banswara'                               , 'DEMO-RJ-BANSWARA-01'),
    ('Rajasthan'                  , 'Baran'                                  , 'DEMO-RJ-BARAN-01'),
    ('Rajasthan'                  , 'Barmer'                                 , 'DEMO-RJ-BARMER-01'),
    ('Rajasthan'                  , 'Bharatpur'                              , 'DEMO-RJ-BHARATPUR-01'),
    ('Rajasthan'                  , 'Bhilwara'                               , 'DEMO-RJ-BHILWARA-01'),
    ('Rajasthan'                  , 'Bikaner'                                , 'DEMO-RJ-BIKANER-01'),
    ('Rajasthan'                  , 'Bundi'                                  , 'DEMO-RJ-BUNDI-01'),
    ('Rajasthan'                  , 'Chittorgarh'                            , 'DEMO-RJ-CHITTORGARH-01'),
    ('Rajasthan'                  , 'Churu'                                  , 'DEMO-RJ-CHURU-01'),
    ('Rajasthan'                  , 'Dausa'                                  , 'DEMO-RJ-DAUSA-01'),
    ('Rajasthan'                  , 'Dholpur'                                , 'DEMO-RJ-DHOLPUR-01'),
    ('Rajasthan'                  , 'Dungarpur'                              , 'DEMO-RJ-DUNGARPUR-01'),
    ('Rajasthan'                  , 'Hanumangarh'                            , 'DEMO-RJ-HANUMANGARH-01'),
    ('Rajasthan'                  , 'Jaipur'                                 , 'DEMO-RJ-JAIPUR-01'),
    ('Rajasthan'                  , 'Jaisalmer'                              , 'DEMO-RJ-JAISALMER-01'),
    ('Rajasthan'                  , 'Jalore'                                 , 'DEMO-RJ-JALORE-01'),
    ('Rajasthan'                  , 'Jhalawar'                               , 'DEMO-RJ-JHALAWAR-01'),
    ('Rajasthan'                  , 'Jhunjhunu'                              , 'DEMO-RJ-JHUNJHUNU-01'),
    ('Rajasthan'                  , 'Jodhpur'                                , 'DEMO-RJ-JODHPUR-01'),
    ('Rajasthan'                  , 'Karauli'                                , 'DEMO-RJ-KARAULI-01'),
    ('Rajasthan'                  , 'Kota'                                   , 'DEMO-RJ-KOTA-01'),
    ('Rajasthan'                  , 'Nagaur'                                 , 'DEMO-RJ-NAGAUR-01'),
    ('Rajasthan'                  , 'Pali'                                   , 'DEMO-RJ-PALI-01'),
    ('Rajasthan'                  , 'Pratapgarh'                             , 'DEMO-RJ-PRATAPGARH-01'),
    ('Rajasthan'                  , 'Rajsamand'                              , 'DEMO-RJ-RAJSAMAND-01'),
    ('Rajasthan'                  , 'Sawai Madhopur'                         , 'DEMO-RJ-SAWAIMADHOPUR-01'),
    ('Rajasthan'                  , 'Sikar'                                  , 'DEMO-RJ-SIKAR-01'),
    ('Rajasthan'                  , 'Sirohi'                                 , 'DEMO-RJ-SIROHI-01'),
    ('Rajasthan'                  , 'Sri Ganganagar'                         , 'DEMO-RJ-SRIGANGANAGAR-01'),
    ('Rajasthan'                  , 'Tonk'                                   , 'DEMO-RJ-TONK-01'),
    ('Rajasthan'                  , 'Udaipur'                                , 'DEMO-RJ-UDAIPUR-01'),

    -- Sikkim
    ('Sikkim'                     , 'East Sikkim'                            , 'DEMO-SK-EASTSIKKIM-01'),
    ('Sikkim'                     , 'North Sikkim'                           , 'DEMO-SK-NORTHSIKKIM-01'),
    ('Sikkim'                     , 'South Sikkim'                           , 'DEMO-SK-SOUTHSIKKIM-01'),
    ('Sikkim'                     , 'West Sikkim'                            , 'DEMO-SK-WESTSIKKIM-01'),

    -- Tamil Nadu
    ('Tamil Nadu'                 , 'Ariyalur'                               , 'DEMO-TN-ARIYALUR-01'),
    ('Tamil Nadu'                 , 'Chennai'                                , 'DEMO-TN-CHENNAI-01'),
    ('Tamil Nadu'                 , 'Coimbatore'                             , 'DEMO-TN-COIMBATORE-01'),
    ('Tamil Nadu'                 , 'Cuddalore'                              , 'DEMO-TN-CUDDALORE-01'),
    ('Tamil Nadu'                 , 'Dharmapuri'                             , 'DEMO-TN-DHARMAPURI-01'),
    ('Tamil Nadu'                 , 'Dindigul'                               , 'DEMO-TN-DINDIGUL-01'),
    ('Tamil Nadu'                 , 'Erode'                                  , 'DEMO-TN-ERODE-01'),
    ('Tamil Nadu'                 , 'Kanchipuram'                            , 'DEMO-TN-KANCHIPURAM-01'),
    ('Tamil Nadu'                 , 'Kanyakumari'                            , 'DEMO-TN-KANYAKUMARI-01'),
    ('Tamil Nadu'                 , 'Karur'                                  , 'DEMO-TN-KARUR-01'),
    ('Tamil Nadu'                 , 'Krishnagiri'                            , 'DEMO-TN-KRISHNAGIRI-01'),
    ('Tamil Nadu'                 , 'Madurai'                                , 'DEMO-TN-MADURAI-01'),
    ('Tamil Nadu'                 , 'Nagapattinam'                           , 'DEMO-TN-NAGAPATTINAM-01'),
    ('Tamil Nadu'                 , 'Namakkal'                               , 'DEMO-TN-NAMAKKAL-01'),
    ('Tamil Nadu'                 , 'Nilgiris'                               , 'DEMO-TN-NILGIRIS-01'),
    ('Tamil Nadu'                 , 'Perambalur'                             , 'DEMO-TN-PERAMBALUR-01'),
    ('Tamil Nadu'                 , 'Pudukkottai'                            , 'DEMO-TN-PUDUKKOTTAI-01'),
    ('Tamil Nadu'                 , 'Ramanathapuram'                         , 'DEMO-TN-RAMANATHAPURAM-01'),
    ('Tamil Nadu'                 , 'Salem'                                  , 'DEMO-TN-SALEM-01'),
    ('Tamil Nadu'                 , 'Sivaganga'                              , 'DEMO-TN-SIVAGANGA-01'),
    ('Tamil Nadu'                 , 'Thanjavur'                              , 'DEMO-TN-THANJAVUR-01'),
    ('Tamil Nadu'                 , 'Theni'                                  , 'DEMO-TN-THENI-01'),
    ('Tamil Nadu'                 , 'Thoothukudi (Tuticorin)'                , 'DEMO-TN-THOOTHUKUDITUTICORIN-01'),
    ('Tamil Nadu'                 , 'Tiruchirappalli'                        , 'DEMO-TN-TIRUCHIRAPPALLI-01'),
    ('Tamil Nadu'                 , 'Tirunelveli'                            , 'DEMO-TN-TIRUNELVELI-01'),
    ('Tamil Nadu'                 , 'Tiruppur'                               , 'DEMO-TN-TIRUPPUR-01'),
    ('Tamil Nadu'                 , 'Tiruvallur'                             , 'DEMO-TN-TIRUVALLUR-01'),
    ('Tamil Nadu'                 , 'Tiruvannamalai'                         , 'DEMO-TN-TIRUVANNAMALAI-01'),
    ('Tamil Nadu'                 , 'Tiruvarur'                              , 'DEMO-TN-TIRUVARUR-01'),
    ('Tamil Nadu'                 , 'Vellore'                                , 'DEMO-TN-VELLORE-01'),
    ('Tamil Nadu'                 , 'Viluppuram'                             , 'DEMO-TN-VILUPPURAM-01'),
    ('Tamil Nadu'                 , 'Virudhunagar'                           , 'DEMO-TN-VIRUDHUNAGAR-01'),

    -- Telangana
    ('Telangana'                  , 'Adilabad'                               , 'DEMO-TG-ADILABAD-01'),
    ('Telangana'                  , 'Bhadradri Kothagudem'                   , 'DEMO-TG-BHADRADRIKOTHAGUDEM-01'),
    ('Telangana'                  , 'Hyderabad'                              , 'DEMO-TG-HYDERABAD-01'),
    ('Telangana'                  , 'Jagtial'                                , 'DEMO-TG-JAGTIAL-01'),
    ('Telangana'                  , 'Jangaon'                                , 'DEMO-TG-JANGAON-01'),
    ('Telangana'                  , 'Jayashankar Bhoopalpally'               , 'DEMO-TG-JAYASHANKARBHOOPALPALLY-01'),
    ('Telangana'                  , 'Jogulamba Gadwal'                       , 'DEMO-TG-JOGULAMBAGADWAL-01'),
    ('Telangana'                  , 'Kamareddy'                              , 'DEMO-TG-KAMAREDDY-01'),
    ('Telangana'                  , 'Karimnagar'                             , 'DEMO-TG-KARIMNAGAR-01'),
    ('Telangana'                  , 'Khammam'                                , 'DEMO-TG-KHAMMAM-01'),
    ('Telangana'                  , 'Komaram Bheem Asifabad'                 , 'DEMO-TG-KOMARAMBHEEMASIFABAD-01'),
    ('Telangana'                  , 'Mahabubabad'                            , 'DEMO-TG-MAHABUBABAD-01'),
    ('Telangana'                  , 'Mahabubnagar'                           , 'DEMO-TG-MAHABUBNAGAR-01'),
    ('Telangana'                  , 'Mancherial'                             , 'DEMO-TG-MANCHERIAL-01'),
    ('Telangana'                  , 'Medak'                                  , 'DEMO-TG-MEDAK-01'),
    ('Telangana'                  , 'Medchal'                                , 'DEMO-TG-MEDCHAL-01'),
    ('Telangana'                  , 'Nagarkurnool'                           , 'DEMO-TG-NAGARKURNOOL-01'),
    ('Telangana'                  , 'Nalgonda'                               , 'DEMO-TG-NALGONDA-01'),
    ('Telangana'                  , 'Nirmal'                                 , 'DEMO-TG-NIRMAL-01'),
    ('Telangana'                  , 'Nizamabad'                              , 'DEMO-TG-NIZAMABAD-01'),
    ('Telangana'                  , 'Peddapalli'                             , 'DEMO-TG-PEDDAPALLI-01'),
    ('Telangana'                  , 'Rajanna Sircilla'                       , 'DEMO-TG-RAJANNASIRCILLA-01'),
    ('Telangana'                  , 'Rangareddy'                             , 'DEMO-TG-RANGAREDDY-01'),
    ('Telangana'                  , 'Sangareddy'                             , 'DEMO-TG-SANGAREDDY-01'),
    ('Telangana'                  , 'Siddipet'                               , 'DEMO-TG-SIDDIPET-01'),
    ('Telangana'                  , 'Suryapet'                               , 'DEMO-TG-SURYAPET-01'),
    ('Telangana'                  , 'Vikarabad'                              , 'DEMO-TG-VIKARABAD-01'),
    ('Telangana'                  , 'Wanaparthy'                             , 'DEMO-TG-WANAPARTHY-01'),
    ('Telangana'                  , 'Warangal (Rural)'                       , 'DEMO-TG-WARANGALRURAL-01'),
    ('Telangana'                  , 'Warangal (Urban)'                       , 'DEMO-TG-WARANGALURBAN-01'),
    ('Telangana'                  , 'Yadadri Bhuvanagiri'                    , 'DEMO-TG-YADADRIBHUVANAGIRI-01'),

    -- Tripura
    ('Tripura'                    , 'Dhalai'                                 , 'DEMO-TR-DHALAI-01'),
    ('Tripura'                    , 'Gomati'                                 , 'DEMO-TR-GOMATI-01'),
    ('Tripura'                    , 'Khowai'                                 , 'DEMO-TR-KHOWAI-01'),
    ('Tripura'                    , 'North Tripura'                          , 'DEMO-TR-NORTHTRIPURA-01'),
    ('Tripura'                    , 'Sepahijala'                             , 'DEMO-TR-SEPAHIJALA-01'),
    ('Tripura'                    , 'South Tripura'                          , 'DEMO-TR-SOUTHTRIPURA-01'),
    ('Tripura'                    , 'Unakoti'                                , 'DEMO-TR-UNAKOTI-01'),
    ('Tripura'                    , 'West Tripura'                           , 'DEMO-TR-WESTTRIPURA-01'),

    -- Uttarakhand
    ('Uttarakhand'                , 'Almora'                                 , 'DEMO-UK-ALMORA-01'),
    ('Uttarakhand'                , 'Bageshwar'                              , 'DEMO-UK-BAGESHWAR-01'),
    ('Uttarakhand'                , 'Chamoli'                                , 'DEMO-UK-CHAMOLI-01'),
    ('Uttarakhand'                , 'Champawat'                              , 'DEMO-UK-CHAMPAWAT-01'),
    ('Uttarakhand'                , 'Dehradun'                               , 'DEMO-UK-DEHRADUN-01'),
    ('Uttarakhand'                , 'Haridwar'                               , 'DEMO-UK-HARIDWAR-01'),
    ('Uttarakhand'                , 'Nainital'                               , 'DEMO-UK-NAINITAL-01'),
    ('Uttarakhand'                , 'Pauri Garhwal'                          , 'DEMO-UK-PAURIGARHWAL-01'),
    ('Uttarakhand'                , 'Pithoragarh'                            , 'DEMO-UK-PITHORAGARH-01'),
    ('Uttarakhand'                , 'Rudraprayag'                            , 'DEMO-UK-RUDRAPRAYAG-01'),
    ('Uttarakhand'                , 'Tehri Garhwal'                          , 'DEMO-UK-TEHRIGARHWAL-01'),
    ('Uttarakhand'                , 'Udham Singh Nagar'                      , 'DEMO-UK-UDHAMSINGHNAGAR-01'),
    ('Uttarakhand'                , 'Uttarkashi'                             , 'DEMO-UK-UTTARKASHI-01'),

    -- Uttar Pradesh
    ('Uttar Pradesh'              , 'Agra'                                   , 'DEMO-UP-AGRA-01'),
    ('Uttar Pradesh'              , 'Aligarh'                                , 'DEMO-UP-ALIGARH-01'),
    ('Uttar Pradesh'              , 'Allahabad'                              , 'DEMO-UP-ALLAHABAD-01'),
    ('Uttar Pradesh'              , 'Ambedkar Nagar'                         , 'DEMO-UP-AMBEDKARNAGAR-01'),
    ('Uttar Pradesh'              , 'Amethi (Chatrapati Sahuji Mahraj Nagar)', 'DEMO-UP-AMETHICHATRAPATISAHUJIMAHRAJNAGAR-01'),
    ('Uttar Pradesh'              , 'Amroha (J.P. Nagar)'                    , 'DEMO-UP-AMROHAJPNAGAR-01'),
    ('Uttar Pradesh'              , 'Auraiya'                                , 'DEMO-UP-AURAIYA-01'),
    ('Uttar Pradesh'              , 'Azamgarh'                               , 'DEMO-UP-AZAMGARH-01'),
    ('Uttar Pradesh'              , 'Baghpat'                                , 'DEMO-UP-BAGHPAT-01'),
    ('Uttar Pradesh'              , 'Bahraich'                               , 'DEMO-UP-BAHRAICH-01'),
    ('Uttar Pradesh'              , 'Ballia'                                 , 'DEMO-UP-BALLIA-01'),
    ('Uttar Pradesh'              , 'Balrampur'                              , 'DEMO-UP-BALRAMPUR-01'),
    ('Uttar Pradesh'              , 'Banda'                                  , 'DEMO-UP-BANDA-01'),
    ('Uttar Pradesh'              , 'Barabanki'                              , 'DEMO-UP-BARABANKI-01'),
    ('Uttar Pradesh'              , 'Bareilly'                               , 'DEMO-UP-BAREILLY-01'),
    ('Uttar Pradesh'              , 'Basti'                                  , 'DEMO-UP-BASTI-01'),
    ('Uttar Pradesh'              , 'Bhadohi'                                , 'DEMO-UP-BHADOHI-01'),
    ('Uttar Pradesh'              , 'Bijnor'                                 , 'DEMO-UP-BIJNOR-01'),
    ('Uttar Pradesh'              , 'Budaun'                                 , 'DEMO-UP-BUDAUN-01'),
    ('Uttar Pradesh'              , 'Bulandshahr'                            , 'DEMO-UP-BULANDSHAHR-01'),
    ('Uttar Pradesh'              , 'Chandauli'                              , 'DEMO-UP-CHANDAULI-01'),
    ('Uttar Pradesh'              , 'Chitrakoot'                             , 'DEMO-UP-CHITRAKOOT-01'),
    ('Uttar Pradesh'              , 'Deoria'                                 , 'DEMO-UP-DEORIA-01'),
    ('Uttar Pradesh'              , 'Etah'                                   , 'DEMO-UP-ETAH-01'),
    ('Uttar Pradesh'              , 'Etawah'                                 , 'DEMO-UP-ETAWAH-01'),
    ('Uttar Pradesh'              , 'Faizabad'                               , 'DEMO-UP-FAIZABAD-01'),
    ('Uttar Pradesh'              , 'Farrukhabad'                            , 'DEMO-UP-FARRUKHABAD-01'),
    ('Uttar Pradesh'              , 'Fatehpur'                               , 'DEMO-UP-FATEHPUR-01'),
    ('Uttar Pradesh'              , 'Firozabad'                              , 'DEMO-UP-FIROZABAD-01'),
    ('Uttar Pradesh'              , 'Gautam Buddha Nagar'                    , 'DEMO-UP-GAUTAMBUDDHANAGAR-01'),
    ('Uttar Pradesh'              , 'Ghaziabad'                              , 'DEMO-UP-GHAZIABAD-01'),
    ('Uttar Pradesh'              , 'Ghazipur'                               , 'DEMO-UP-GHAZIPUR-01'),
    ('Uttar Pradesh'              , 'Gonda'                                  , 'DEMO-UP-GONDA-01'),
    ('Uttar Pradesh'              , 'Gorakhpur'                              , 'DEMO-UP-GORAKHPUR-01'),
    ('Uttar Pradesh'              , 'Hamirpur'                               , 'DEMO-UP-HAMIRPUR-01'),
    ('Uttar Pradesh'              , 'Hapur (Panchsheel Nagar)'               , 'DEMO-UP-HAPURPANCHSHEELNAGAR-01'),
    ('Uttar Pradesh'              , 'Hardoi'                                 , 'DEMO-UP-HARDOI-01'),
    ('Uttar Pradesh'              , 'Hathras'                                , 'DEMO-UP-HATHRAS-01'),
    ('Uttar Pradesh'              , 'Jalaun'                                 , 'DEMO-UP-JALAUN-01'),
    ('Uttar Pradesh'              , 'Jaunpur'                                , 'DEMO-UP-JAUNPUR-01'),
    ('Uttar Pradesh'              , 'Jhansi'                                 , 'DEMO-UP-JHANSI-01'),
    ('Uttar Pradesh'              , 'Kannauj'                                , 'DEMO-UP-KANNAUJ-01'),
    ('Uttar Pradesh'              , 'Kanpur Dehat'                           , 'DEMO-UP-KANPURDEHAT-01'),
    ('Uttar Pradesh'              , 'Kanpur Nagar'                           , 'DEMO-UP-KANPURNAGAR-01'),
    ('Uttar Pradesh'              , 'Kanshiram Nagar (Kasganj)'              , 'DEMO-UP-KANSHIRAMNAGARKASGANJ-01'),
    ('Uttar Pradesh'              , 'Kaushambi'                              , 'DEMO-UP-KAUSHAMBI-01'),
    ('Uttar Pradesh'              , 'Kushinagar (Padrauna)'                  , 'DEMO-UP-KUSHINAGARPADRAUNA-01'),
    ('Uttar Pradesh'              , 'Lakhimpur - Kheri'                      , 'DEMO-UP-LAKHIMPURKHERI-01'),
    ('Uttar Pradesh'              , 'Lalitpur'                               , 'DEMO-UP-LALITPUR-01'),
    ('Uttar Pradesh'              , 'Lucknow'                                , 'DEMO-UP-LUCKNOW-01'),
    ('Uttar Pradesh'              , 'Maharajganj'                            , 'DEMO-UP-MAHARAJGANJ-01'),
    ('Uttar Pradesh'              , 'Mahoba'                                 , 'DEMO-UP-MAHOBA-01'),
    ('Uttar Pradesh'              , 'Mainpuri'                               , 'DEMO-UP-MAINPURI-01'),
    ('Uttar Pradesh'              , 'Mathura'                                , 'DEMO-UP-MATHURA-01'),
    ('Uttar Pradesh'              , 'Mau'                                    , 'DEMO-UP-MAU-01'),
    ('Uttar Pradesh'              , 'Meerut'                                 , 'DEMO-UP-MEERUT-01'),
    ('Uttar Pradesh'              , 'Mirzapur'                               , 'DEMO-UP-MIRZAPUR-01'),
    ('Uttar Pradesh'              , 'Moradabad'                              , 'DEMO-UP-MORADABAD-01'),
    ('Uttar Pradesh'              , 'Muzaffarnagar'                          , 'DEMO-UP-MUZAFFARNAGAR-01'),
    ('Uttar Pradesh'              , 'Pilibhit'                               , 'DEMO-UP-PILIBHIT-01'),
    ('Uttar Pradesh'              , 'Pratapgarh'                             , 'DEMO-UP-PRATAPGARH-01'),
    ('Uttar Pradesh'              , 'RaeBareli'                              , 'DEMO-UP-RAEBARELI-01'),
    ('Uttar Pradesh'              , 'Rampur'                                 , 'DEMO-UP-RAMPUR-01'),
    ('Uttar Pradesh'              , 'Saharanpur'                             , 'DEMO-UP-SAHARANPUR-01'),
    ('Uttar Pradesh'              , 'Sambhal (Bhim Nagar)'                   , 'DEMO-UP-SAMBHALBHIMNAGAR-01'),
    ('Uttar Pradesh'              , 'Sant Kabir Nagar'                       , 'DEMO-UP-SANTKABIRNAGAR-01'),
    ('Uttar Pradesh'              , 'Shahjahanpur'                           , 'DEMO-UP-SHAHJAHANPUR-01'),
    ('Uttar Pradesh'              , 'Shamali (Prabuddh Nagar)'               , 'DEMO-UP-SHAMALIPRABUDDHNAGAR-01'),
    ('Uttar Pradesh'              , 'Shravasti'                              , 'DEMO-UP-SHRAVASTI-01'),
    ('Uttar Pradesh'              , 'Siddharth Nagar'                        , 'DEMO-UP-SIDDHARTHNAGAR-01'),
    ('Uttar Pradesh'              , 'Sitapur'                                , 'DEMO-UP-SITAPUR-01'),
    ('Uttar Pradesh'              , 'Sonbhadra'                              , 'DEMO-UP-SONBHADRA-01'),
    ('Uttar Pradesh'              , 'Sultanpur'                              , 'DEMO-UP-SULTANPUR-01'),
    ('Uttar Pradesh'              , 'Unnao'                                  , 'DEMO-UP-UNNAO-01'),
    ('Uttar Pradesh'              , 'Varanasi'                               , 'DEMO-UP-VARANASI-01'),

    -- West Bengal
    ('West Bengal'                , 'Alipurduar'                             , 'DEMO-WB-ALIPURDUAR-01'),
    ('West Bengal'                , 'Bankura'                                , 'DEMO-WB-BANKURA-01'),
    ('West Bengal'                , 'Birbhum'                                , 'DEMO-WB-BIRBHUM-01'),
    ('West Bengal'                , 'Burdwan (Bardhaman)'                    , 'DEMO-WB-BURDWANBARDHAMAN-01'),
    ('West Bengal'                , 'Cooch Behar'                            , 'DEMO-WB-COOCHBEHAR-01'),
    ('West Bengal'                , 'Dakshin Dinajpur (South Dinajpur)'      , 'DEMO-WB-DAKSHINDINAJPURSOUTHDINAJPUR-01'),
    ('West Bengal'                , 'Darjeeling'                             , 'DEMO-WB-DARJEELING-01'),
    ('West Bengal'                , 'Hooghly'                                , 'DEMO-WB-HOOGHLY-01'),
    ('West Bengal'                , 'Howrah'                                 , 'DEMO-WB-HOWRAH-01'),
    ('West Bengal'                , 'Jalpaiguri'                             , 'DEMO-WB-JALPAIGURI-01'),
    ('West Bengal'                , 'Kalimpong'                              , 'DEMO-WB-KALIMPONG-01'),
    ('West Bengal'                , 'Kolkata'                                , 'DEMO-WB-KOLKATA-01'),
    ('West Bengal'                , 'Malda'                                  , 'DEMO-WB-MALDA-01'),
    ('West Bengal'                , 'Murshidabad'                            , 'DEMO-WB-MURSHIDABAD-01'),
    ('West Bengal'                , 'Nadia'                                  , 'DEMO-WB-NADIA-01'),
    ('West Bengal'                , 'North 24 Parganas'                      , 'DEMO-WB-NORTH24PARGANAS-01'),
    ('West Bengal'                , 'Paschim Medinipur (West Medinipur)'     , 'DEMO-WB-PASCHIMMEDINIPURWESTMEDINIPUR-01'),
    ('West Bengal'                , 'Purba Medinipur (East Medinipur)'       , 'DEMO-WB-PURBAMEDINIPUREASTMEDINIPUR-01'),
    ('West Bengal'                , 'Purulia'                                , 'DEMO-WB-PURULIA-01'),
    ('West Bengal'                , 'South 24 Parganas'                      , 'DEMO-WB-SOUTH24PARGANAS-01'),
    ('West Bengal'                , 'Uttar Dinajpur (North Dinajpur)'        , 'DEMO-WB-UTTARDINAJPURNORTHDINAJPUR-01')
;


-- -----------------------------------------------------------------------------
-- CONFIGURED: states. Uttar Pradesh already exists as OFFICIAL from import
-- 0002 and is matched by name, so it is skipped rather than duplicated.
-- lgd_code is NULL because no LGD code was retrieved — not because one was
-- withheld. Permitted for non-OFFICIAL rows by migration 0023.
-- -----------------------------------------------------------------------------
INSERT INTO states (lgd_code, name, data_type, source_id)
SELECT DISTINCT NULL::text, g.state, 'CONFIGURED'::data_type_t, NULL::uuid
  FROM _geo g
 WHERE NOT EXISTS (
       SELECT 1 FROM states s WHERE lower(btrim(s.name)) = lower(btrim(g.state))
 );


-- -----------------------------------------------------------------------------
-- CONFIGURED: districts. The five Uttar Pradesh districts from import 0002 are
-- matched by name within their state and skipped.
-- -----------------------------------------------------------------------------
INSERT INTO districts (state_id, lgd_code, name, data_type, source_id)
SELECT s.id, NULL::text, g.district, 'CONFIGURED'::data_type_t, NULL::uuid
  FROM _geo g
  JOIN states s ON lower(btrim(s.name)) = lower(btrim(g.state))
 WHERE NOT EXISTS (
       SELECT 1 FROM districts d
        WHERE d.state_id = s.id
          AND lower(btrim(d.name)) = lower(btrim(g.district))
 );


-- -----------------------------------------------------------------------------
-- CONFIGURED: one demonstration procurement centre per district, for districts
-- that do not already have one. The five centres from import 0002 keep their
-- existing DEMO-UP-<DISTRICT>-01 codes; no district is given a second centre.
--
-- No mandi_id, no coordinates, no government identifier. storage_check_mode is
-- left at the ADVISORY default (decision D-8 / D-10).
-- -----------------------------------------------------------------------------
-- The ids are captured with RETURNING rather than re-selected by code, because
-- this file's codes for the five Aligarh/Agra/Hathras/Mathura/Bulandshahr
-- centres are byte-identical to the ones import 0002 already used. Matching on
-- code afterwards would sweep those five back in and overwrite the deliberately
-- heterogeneous lanes, hours and rates they were given there. RETURNING yields
-- exactly the rows this statement inserted and nothing else, which also makes
-- every configuration step below a no-op on a second run.
CREATE TEMP TABLE _new_centres ON COMMIT DROP AS
WITH inserted AS (
    INSERT INTO procurement_centres (
        code, name, state_id, district_id, mandi_id,
        latitude, longitude, timezone, status, storage_check_mode, data_type, source_id
    )
    SELECT g.centre_code,
           g.district || ' Demonstration Procurement Centre',
           s.id, d.id, NULL::uuid,
           NULL::numeric, NULL::numeric, 'Asia/Kolkata', 'ACTIVE', 'ADVISORY',
           'CONFIGURED'::data_type_t, NULL::uuid
      FROM _geo g
      JOIN states s    ON lower(btrim(s.name)) = lower(btrim(g.state))
      JOIN districts d ON d.state_id = s.id
                      AND lower(btrim(d.name)) = lower(btrim(g.district))
     WHERE NOT EXISTS (
           SELECT 1 FROM procurement_centres pc WHERE pc.district_id = d.id
     )
    RETURNING id
)
SELECT id FROM inserted;


-- -----------------------------------------------------------------------------
-- A centre is only useful once it has lanes, hours, slot parameters and crop
-- eligibility. Everything below is scoped to _new_centres, so the five centres
-- from import 0002 keep the configuration they were deliberately given there.
-- -----------------------------------------------------------------------------


-- CONFIGURED: two service lanes per centre.
INSERT INTO centre_service_lanes (centre_id, lane_no, name, is_active)
SELECT c.id, l.lane_no, 'Lane ' || l.lane_no, true
  FROM _new_centres c
 CROSS JOIN (VALUES (1::smallint), (2::smallint)) AS l(lane_no)
    ON CONFLICT (centre_id, lane_no) DO NOTHING;


-- CONFIGURED: working hours, Monday-Saturday. Sunday (day_of_week 0) is simply
-- absent, which is how the scheduling engine reads "closed".
INSERT INTO centre_operating_hours (
    centre_id, day_of_week, opens_at, closes_at, effective_from, effective_to,
    data_type, configured_by_user_id, configuration_note
)
SELECT c.id, d.dow, TIME '08:00', TIME '18:00', DATE '2026-09-01', NULL,
       'CONFIGURED',
       (SELECT admin_id FROM _cfg_ctx),
       'Demonstration working hours. Not published by any government source.'
  FROM _new_centres c
 CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(dow)
 WHERE NOT EXISTS (
       SELECT 1 FROM centre_operating_hours h
        WHERE h.centre_id = c.id AND h.day_of_week = d.dow
 );


-- CONFIGURED: slot / processing-time parameters, matching the defaults import
-- 0002 gave its centres. 2500 kg reference = 25 quintal, about an hour, which
-- is the operational figure the project brief implies. These are OPERATIONAL
-- CONFIGURATION, not government policy.
INSERT INTO centre_slot_configurations (
    centre_id, reference_quantity_kg, reference_processing_minutes,
    minimum_processing_minutes, maximum_processing_minutes,
    transition_buffer_minutes, slot_granularity_minutes,
    booking_horizon_days, cancellation_cutoff_hours, max_daily_processing_kg,
    effective_from, effective_to, data_type, configured_by_user_id, configuration_note
)
SELECT c.id, 2500, 60, 30, 180, 15, 15, 7, 24, NULL,
       DATE '2026-09-01', NULL, 'CONFIGURED',
       (SELECT admin_id FROM _cfg_ctx),
       'Demonstration scheduling parameters. max_daily_processing_kg is NULL, meaning no configured daily ceiling rather than zero.'
  FROM _new_centres c
 WHERE NOT EXISTS (
       SELECT 1 FROM centre_slot_configurations sc WHERE sc.centre_id = c.id
 );


-- CONFIGURED: crop eligibility. Which crops exist, and which season each one
-- belongs to, is read from the OFFICIAL MSP import rather than assumed here —
-- season assignment always comes from the source publication. Only the
-- centre-to-crop assignment and the storage figure are configured, and the
-- storage figure (500 quintal per crop per centre) is a demonstration number,
-- not a claim about any real warehouse.
--
-- effective_from is the demonstration configuration date, NOT a claim about
-- when a marketing season begins — no source publishes those boundaries.
INSERT INTO centre_crop_configurations (
    centre_id, crop_id, season_id, marketing_year, is_active,
    storage_capacity_kg,
    effective_from, effective_to, data_type, configured_by_user_id, configuration_note
)
SELECT c.id, m.crop_id, m.season_id, m.marketing_year, true,
       50000,
       DATE '2026-09-01', NULL, 'CONFIGURED',
       (SELECT admin_id FROM _cfg_ctx),
       'Demonstration crop eligibility. Crop and season taken from the MSP import; effective_from is the configuration date, not a season boundary.'
  FROM _new_centres c
 CROSS JOIN (
       SELECT DISTINCT crop_id, season_id, marketing_year
         FROM msp_rates
        WHERE marketing_year = '2026-27'
 ) AS m
    ON CONFLICT DO NOTHING;


UPDATE reference_versions SET version = version + 1, updated_at = now()
WHERE resource IN ('states', 'districts', 'procurement_centres');

COMMIT;
