--
-- PostgreSQL database dump
--

-- Dumped from database version 10.19
-- Dumped by pg_dump version 10.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.socialaccount_socialaccount DROP CONSTRAINT socialaccount_socialaccount_user_id_8146e70c_fk_auth_user_id;
ALTER TABLE ONLY public.socialaccount_socialapp_sites DROP CONSTRAINT socialaccount_social_socialapp_id_97fb6e7d_fk_socialacc;
ALTER TABLE ONLY public.socialaccount_socialapp_sites DROP CONSTRAINT socialaccount_social_site_id_2579dee5_fk_django_si;
ALTER TABLE ONLY public.socialaccount_socialtoken DROP CONSTRAINT socialaccount_social_app_id_636a42d7_fk_socialacc;
ALTER TABLE ONLY public.socialaccount_socialtoken DROP CONSTRAINT socialaccount_social_account_id_951f210e_fk_socialacc;
ALTER TABLE ONLY public.organizations_organization DROP CONSTRAINT organizations_organization_owner_id_f9657a39_fk_auth_user_id;
ALTER TABLE ONLY public.organizations_membership DROP CONSTRAINT organizations_membership_user_id_a8e72055_fk_auth_user_id;
ALTER TABLE ONLY public.organizations_membership DROP CONSTRAINT organizations_member_organization_id_6889aa64_fk_organizat;
ALTER TABLE ONLY public.organizations_invitation DROP CONSTRAINT organizations_invitation_owner_id_d8ffe9d9_fk_auth_user_id;
ALTER TABLE ONLY public.organizations_invitation DROP CONSTRAINT organizations_invita_membership_id_d0265539_fk_organizat;
ALTER TABLE ONLY public.dataset_repo_gitdata DROP CONSTRAINT git_gitdata_task_id_a6f2ea20_fk_engine_task_id;
ALTER TABLE ONLY public.engine_video DROP CONSTRAINT engine_video_data_id_b37015e9_fk_engine_data_id;
ALTER TABLE ONLY public.engine_trackedshapeattributeval DROP CONSTRAINT engine_trackedshapea_spec_id_a944a532_fk_engine_at;
ALTER TABLE ONLY public.engine_trackedshapeattributeval DROP CONSTRAINT engine_trackedshapea_shape_id_361f0e2f_fk_engine_tr;
ALTER TABLE ONLY public.engine_trackedshape DROP CONSTRAINT engine_trackedshape_track_id_a6dc58bd_fk_engine_labeledtrack_id;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_project_id_2dced848_fk_engine_project_id;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_owner_id_95de3361_fk_auth_user_id;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_organization_id_6640bc33_fk_organizat;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_data_id_e98ffd9b_fk_engine_data_id;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_assignee_id_51c82720_fk_auth_user_id;
ALTER TABLE ONLY public.engine_serverfile DROP CONSTRAINT engine_serverfile_data_id_2364110a_fk_engine_data_id;
ALTER TABLE ONLY public.engine_segment DROP CONSTRAINT engine_segment_task_id_37d935cf_fk_engine_task_id;
ALTER TABLE ONLY public.engine_remotefile DROP CONSTRAINT engine_remotefile_data_id_ff16acda_fk_engine_data_id;
ALTER TABLE ONLY public.engine_relatedfile DROP CONSTRAINT engine_relatedfile_primary_image_id_928aa7d5_fk_engine_image_id;
ALTER TABLE ONLY public.engine_relatedfile DROP CONSTRAINT engine_relatedfile_data_id_aa10f063_fk_engine_data_id;
ALTER TABLE ONLY public.engine_project DROP CONSTRAINT engine_project_owner_id_de2a8424_fk_auth_user_id;
ALTER TABLE ONLY public.engine_project DROP CONSTRAINT engine_project_organization_id_21c08e6b_fk_organizat;
ALTER TABLE ONLY public.engine_project DROP CONSTRAINT engine_project_assignee_id_77655de8_fk_auth_user_id;
ALTER TABLE ONLY public.engine_profile DROP CONSTRAINT engine_profile_user_id_19972afd_fk_auth_user_id;
ALTER TABLE ONLY public.engine_manifest DROP CONSTRAINT engine_manifest_cloud_storage_id_a0af24a9_fk_engine_cl;
ALTER TABLE ONLY public.engine_labeledtrackattributeval DROP CONSTRAINT engine_labeledtracka_track_id_4ed9e160_fk_engine_la;
ALTER TABLE ONLY public.engine_labeledtrackattributeval DROP CONSTRAINT engine_labeledtracka_spec_id_b7ee6fd2_fk_engine_at;
ALTER TABLE ONLY public.engine_labeledtrack DROP CONSTRAINT engine_labeledtrack_label_id_75d2c39b_fk_engine_label_id;
ALTER TABLE ONLY public.engine_labeledtrack DROP CONSTRAINT engine_labeledtrack_job_id_e00d9f2f_fk_engine_job_id;
ALTER TABLE ONLY public.engine_labeledshapeattributeval DROP CONSTRAINT engine_labeledshapea_spec_id_144b73fa_fk_engine_at;
ALTER TABLE ONLY public.engine_labeledshapeattributeval DROP CONSTRAINT engine_labeledshapea_shape_id_26c4daab_fk_engine_la;
ALTER TABLE ONLY public.engine_labeledshape DROP CONSTRAINT engine_labeledshape_label_id_872e4658_fk_engine_label_id;
ALTER TABLE ONLY public.engine_labeledshape DROP CONSTRAINT engine_labeledshape_job_id_b7694c3a_fk_engine_job_id;
ALTER TABLE ONLY public.engine_labeledimageattributeval DROP CONSTRAINT engine_labeledimagea_spec_id_911f524c_fk_engine_at;
ALTER TABLE ONLY public.engine_labeledimageattributeval DROP CONSTRAINT engine_labeledimagea_image_id_f4c34a7a_fk_engine_la;
ALTER TABLE ONLY public.engine_labeledimage DROP CONSTRAINT engine_labeledimage_label_id_b22eb9f7_fk_engine_label_id;
ALTER TABLE ONLY public.engine_labeledimage DROP CONSTRAINT engine_labeledimage_job_id_7406d161_fk_engine_job_id;
ALTER TABLE ONLY public.engine_label DROP CONSTRAINT engine_label_task_id_f11c5c1a_fk_engine_task_id;
ALTER TABLE ONLY public.engine_label DROP CONSTRAINT engine_label_project_id_7f02a656_fk_engine_project_id;
ALTER TABLE ONLY public.engine_jobcommit DROP CONSTRAINT engine_jobcommit_owner_id_3de5f6de_fk_auth_user_id;
ALTER TABLE ONLY public.engine_jobcommit DROP CONSTRAINT engine_jobcommit_job_id_02b6da1d_fk_engine_job_id;
ALTER TABLE ONLY public.engine_job DROP CONSTRAINT engine_job_segment_id_f615a866_fk_engine_segment_id;
ALTER TABLE ONLY public.engine_job DROP CONSTRAINT engine_job_assignee_id_b80bea03_fk_auth_user_id;
ALTER TABLE ONLY public.engine_issue DROP CONSTRAINT engine_issue_owner_id_b1ef7592_fk_auth_user_id;
ALTER TABLE ONLY public.engine_issue DROP CONSTRAINT engine_issue_job_id_2d12d046_fk_engine_job_id;
ALTER TABLE ONLY public.engine_issue DROP CONSTRAINT engine_issue_assignee_id_4ce5e564_fk_auth_user_id;
ALTER TABLE ONLY public.engine_image DROP CONSTRAINT engine_image_data_id_e89da547_fk_engine_data_id;
ALTER TABLE ONLY public.engine_data DROP CONSTRAINT engine_data_cloud_storage_id_e7e0d44a_fk_engine_cloudstorage_id;
ALTER TABLE ONLY public.engine_comment DROP CONSTRAINT engine_comment_owner_id_c700667b_fk_auth_user_id;
ALTER TABLE ONLY public.engine_comment DROP CONSTRAINT engine_comment_issue_id_46db9977_fk_engine_issue_id;
ALTER TABLE ONLY public.engine_cloudstorage DROP CONSTRAINT engine_cloudstorage_owner_id_b8773f4a_fk_auth_user_id;
ALTER TABLE ONLY public.engine_cloudstorage DROP CONSTRAINT engine_cloudstorage_organization_id_a9b82f16_fk_organizat;
ALTER TABLE ONLY public.engine_clientfile DROP CONSTRAINT engine_clientfile_data_id_24222cd2_fk_engine_data_id;
ALTER TABLE ONLY public.engine_attributespec DROP CONSTRAINT engine_attributespec_label_id_274838ef_fk_engine_label_id;
ALTER TABLE ONLY public.django_admin_log DROP CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id;
ALTER TABLE ONLY public.django_admin_log DROP CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co;
ALTER TABLE ONLY public.authtoken_token DROP CONSTRAINT authtoken_token_user_id_35299eff_fk_auth_user_id;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE ONLY public.account_emailconfirmation DROP CONSTRAINT account_emailconfirm_email_address_id_5b7f8c58_fk_account_e;
ALTER TABLE ONLY public.account_emailaddress DROP CONSTRAINT account_emailaddress_user_id_2c513194_fk_auth_user_id;
DROP INDEX public.socialaccount_socialtoken_app_id_636a42d7;
DROP INDEX public.socialaccount_socialtoken_account_id_951f210e;
DROP INDEX public.socialaccount_socialapp_sites_socialapp_id_97fb6e7d;
DROP INDEX public.socialaccount_socialapp_sites_site_id_2579dee5;
DROP INDEX public.socialaccount_socialaccount_user_id_8146e70c;
DROP INDEX public.organizations_organization_slug_e36fd8f9_like;
DROP INDEX public.organizations_organization_owner_id_f9657a39;
DROP INDEX public.organizations_membership_user_id_a8e72055;
DROP INDEX public.organizations_membership_organization_id_6889aa64;
DROP INDEX public.organizations_invitation_owner_id_d8ffe9d9;
DROP INDEX public.organizations_invitation_key_514623ce_like;
DROP INDEX public.engine_trackedshapeattributeval_spec_id_a944a532;
DROP INDEX public.engine_trackedshapeattributeval_shape_id_361f0e2f;
DROP INDEX public.engine_trackedshape_track_id_a6dc58bd;
DROP INDEX public.engine_task_project_id_2dced848;
DROP INDEX public.engine_task_owner_id_95de3361;
DROP INDEX public.engine_task_organization_id_6640bc33;
DROP INDEX public.engine_task_data_id_e98ffd9b;
DROP INDEX public.engine_task_assignee_id_51c82720;
DROP INDEX public.engine_serverfile_data_id_2364110a;
DROP INDEX public.engine_segment_task_id_37d935cf;
DROP INDEX public.engine_remotefile_data_id_ff16acda;
DROP INDEX public.engine_relatedfile_primary_image_id_928aa7d5;
DROP INDEX public.engine_relatedfile_data_id_aa10f063;
DROP INDEX public.engine_project_owner_id_de2a8424;
DROP INDEX public.engine_project_organization_id_21c08e6b;
DROP INDEX public.engine_project_assignee_id_77655de8;
DROP INDEX public.engine_manifest_cloud_storage_id_a0af24a9;
DROP INDEX public.engine_labeledtrackattributeval_track_id_4ed9e160;
DROP INDEX public.engine_labeledtrackattributeval_spec_id_b7ee6fd2;
DROP INDEX public.engine_labeledtrack_label_id_75d2c39b;
DROP INDEX public.engine_labeledtrack_job_id_e00d9f2f;
DROP INDEX public.engine_labeledshapeattributeval_spec_id_144b73fa;
DROP INDEX public.engine_labeledshapeattributeval_shape_id_26c4daab;
DROP INDEX public.engine_labeledshape_label_id_872e4658;
DROP INDEX public.engine_labeledshape_job_id_b7694c3a;
DROP INDEX public.engine_labeledimageattributeval_spec_id_911f524c;
DROP INDEX public.engine_labeledimageattributeval_image_id_f4c34a7a;
DROP INDEX public.engine_labeledimage_label_id_b22eb9f7;
DROP INDEX public.engine_labeledimage_job_id_7406d161;
DROP INDEX public.engine_label_task_id_f11c5c1a;
DROP INDEX public.engine_label_project_id_7f02a656;
DROP INDEX public.engine_jobcommit_job_id_02b6da1d;
DROP INDEX public.engine_jobcommit_author_id_fe2728f3;
DROP INDEX public.engine_job_segment_id_f615a866;
DROP INDEX public.engine_job_annotator_id_d0696062;
DROP INDEX public.engine_issue_owner_id_b1ef7592;
DROP INDEX public.engine_issue_job_id_2d12d046;
DROP INDEX public.engine_issue_assignee_id_4ce5e564;
DROP INDEX public.engine_image_data_id_e89da547;
DROP INDEX public.engine_data_cloud_storage_id_e7e0d44a;
DROP INDEX public.engine_comment_issue_id_46db9977;
DROP INDEX public.engine_comment_author_id_92716231;
DROP INDEX public.engine_cloudstorage_owner_id_b8773f4a;
DROP INDEX public.engine_cloudstorage_organization_id_a9b82f16;
DROP INDEX public.engine_clientfile_data_id_24222cd2;
DROP INDEX public.engine_attributespec_label_id_274838ef;
DROP INDEX public.django_site_domain_a2e37b91_like;
DROP INDEX public.django_session_session_key_c0390e0f_like;
DROP INDEX public.django_session_expire_date_a5c62663;
DROP INDEX public.django_admin_log_user_id_c564eba6;
DROP INDEX public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX public.authtoken_token_key_10f0b77e_like;
DROP INDEX public.auth_user_username_6821ab7c_like;
DROP INDEX public.auth_user_user_permissions_user_id_a95ead1b;
DROP INDEX public.auth_user_user_permissions_permission_id_1fbb5f2c;
DROP INDEX public.auth_user_groups_user_id_6a12ed8b;
DROP INDEX public.auth_user_groups_group_id_97559544;
DROP INDEX public.auth_permission_content_type_id_2f476e4b;
DROP INDEX public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX public.auth_group_name_a6ea08ec_like;
DROP INDEX public.account_emailconfirmation_key_f43612bd_like;
DROP INDEX public.account_emailconfirmation_email_address_id_5b7f8c58;
DROP INDEX public.account_emailaddress_user_id_2c513194;
DROP INDEX public.account_emailaddress_email_03be32b2_like;
ALTER TABLE ONLY public.socialaccount_socialtoken DROP CONSTRAINT socialaccount_socialtoken_pkey;
ALTER TABLE ONLY public.socialaccount_socialtoken DROP CONSTRAINT socialaccount_socialtoken_app_id_account_id_fca4e0ac_uniq;
ALTER TABLE ONLY public.socialaccount_socialapp_sites DROP CONSTRAINT socialaccount_socialapp_sites_pkey;
ALTER TABLE ONLY public.socialaccount_socialapp DROP CONSTRAINT socialaccount_socialapp_pkey;
ALTER TABLE ONLY public.socialaccount_socialapp_sites DROP CONSTRAINT socialaccount_socialapp__socialapp_id_site_id_71a9a768_uniq;
ALTER TABLE ONLY public.socialaccount_socialaccount DROP CONSTRAINT socialaccount_socialaccount_provider_uid_fc810c6e_uniq;
ALTER TABLE ONLY public.socialaccount_socialaccount DROP CONSTRAINT socialaccount_socialaccount_pkey;
ALTER TABLE ONLY public.organizations_organization DROP CONSTRAINT organizations_organization_slug_key;
ALTER TABLE ONLY public.organizations_organization DROP CONSTRAINT organizations_organization_pkey;
ALTER TABLE ONLY public.organizations_membership DROP CONSTRAINT organizations_membership_user_id_organization_id_b9b50ec7_uniq;
ALTER TABLE ONLY public.organizations_membership DROP CONSTRAINT organizations_membership_pkey;
ALTER TABLE ONLY public.organizations_invitation DROP CONSTRAINT organizations_invitation_pkey;
ALTER TABLE ONLY public.organizations_invitation DROP CONSTRAINT organizations_invitation_membership_id_key;
ALTER TABLE ONLY public.dataset_repo_gitdata DROP CONSTRAINT git_gitdata_pkey;
ALTER TABLE ONLY public.engine_video DROP CONSTRAINT engine_video_pkey;
ALTER TABLE ONLY public.engine_video DROP CONSTRAINT engine_video_data_id_key;
ALTER TABLE ONLY public.engine_trackedshapeattributeval DROP CONSTRAINT engine_trackedshapeattributeval_pkey;
ALTER TABLE ONLY public.engine_trackedshape DROP CONSTRAINT engine_trackedshape_pkey;
ALTER TABLE ONLY public.engine_task DROP CONSTRAINT engine_task_pkey;
ALTER TABLE ONLY public.engine_serverfile DROP CONSTRAINT engine_serverfile_pkey;
ALTER TABLE ONLY public.engine_segment DROP CONSTRAINT engine_segment_pkey;
ALTER TABLE ONLY public.engine_remotefile DROP CONSTRAINT engine_remotefile_pkey;
ALTER TABLE ONLY public.engine_relatedfile DROP CONSTRAINT engine_relatedfile_pkey;
ALTER TABLE ONLY public.engine_relatedfile DROP CONSTRAINT engine_relatedfile_data_id_path_a7223d1e_uniq;
ALTER TABLE ONLY public.engine_project DROP CONSTRAINT engine_project_pkey;
ALTER TABLE ONLY public.engine_profile DROP CONSTRAINT engine_profile_user_id_key;
ALTER TABLE ONLY public.engine_profile DROP CONSTRAINT engine_profile_pkey;
ALTER TABLE ONLY public.engine_manifest DROP CONSTRAINT engine_manifest_pkey;
ALTER TABLE ONLY public.engine_labeledtrackattributeval DROP CONSTRAINT engine_labeledtrackattributeval_pkey;
ALTER TABLE ONLY public.engine_labeledtrack DROP CONSTRAINT engine_labeledtrack_pkey;
ALTER TABLE ONLY public.engine_labeledshapeattributeval DROP CONSTRAINT engine_labeledshapeattributeval_pkey;
ALTER TABLE ONLY public.engine_labeledshape DROP CONSTRAINT engine_labeledshape_pkey;
ALTER TABLE ONLY public.engine_labeledimageattributeval DROP CONSTRAINT engine_labeledimageattributeval_pkey;
ALTER TABLE ONLY public.engine_labeledimage DROP CONSTRAINT engine_labeledimage_pkey;
ALTER TABLE ONLY public.engine_label DROP CONSTRAINT engine_label_task_id_name_00e8779a_uniq;
ALTER TABLE ONLY public.engine_label DROP CONSTRAINT engine_label_pkey;
ALTER TABLE ONLY public.engine_jobcommit DROP CONSTRAINT engine_jobcommit_pkey;
ALTER TABLE ONLY public.engine_job DROP CONSTRAINT engine_job_pkey;
ALTER TABLE ONLY public.engine_issue DROP CONSTRAINT engine_issue_pkey;
ALTER TABLE ONLY public.engine_image DROP CONSTRAINT engine_image_pkey;
ALTER TABLE ONLY public.engine_data DROP CONSTRAINT engine_data_pkey;
ALTER TABLE ONLY public.engine_comment DROP CONSTRAINT engine_comment_pkey;
ALTER TABLE ONLY public.engine_cloudstorage DROP CONSTRAINT engine_cloudstorage_provider_type_resource_c_d420f2e9_uniq;
ALTER TABLE ONLY public.engine_cloudstorage DROP CONSTRAINT engine_cloudstorage_pkey;
ALTER TABLE ONLY public.engine_clientfile DROP CONSTRAINT engine_clientfile_pkey;
ALTER TABLE ONLY public.engine_clientfile DROP CONSTRAINT engine_clientfile_data_id_file_c9989a74_uniq;
ALTER TABLE ONLY public.engine_attributespec DROP CONSTRAINT engine_attributespec_pkey;
ALTER TABLE ONLY public.engine_attributespec DROP CONSTRAINT engine_attributespec_label_id_name_d85e616c_uniq;
ALTER TABLE ONLY public.django_site DROP CONSTRAINT django_site_pkey;
ALTER TABLE ONLY public.django_site DROP CONSTRAINT django_site_domain_a2e37b91_uniq;
ALTER TABLE ONLY public.django_session DROP CONSTRAINT django_session_pkey;
ALTER TABLE ONLY public.django_migrations DROP CONSTRAINT django_migrations_pkey;
ALTER TABLE ONLY public.django_content_type DROP CONSTRAINT django_content_type_pkey;
ALTER TABLE ONLY public.django_content_type DROP CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE ONLY public.django_admin_log DROP CONSTRAINT django_admin_log_pkey;
ALTER TABLE ONLY public.authtoken_token DROP CONSTRAINT authtoken_token_user_id_key;
ALTER TABLE ONLY public.authtoken_token DROP CONSTRAINT authtoken_token_pkey;
ALTER TABLE ONLY public.auth_user DROP CONSTRAINT auth_user_username_key;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_pkey;
ALTER TABLE ONLY public.auth_user DROP CONSTRAINT auth_user_pkey;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_pkey;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_pkey;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE ONLY public.auth_group DROP CONSTRAINT auth_group_pkey;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_pkey;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE ONLY public.auth_group DROP CONSTRAINT auth_group_name_key;
ALTER TABLE ONLY public.account_emailconfirmation DROP CONSTRAINT account_emailconfirmation_pkey;
ALTER TABLE ONLY public.account_emailconfirmation DROP CONSTRAINT account_emailconfirmation_key_key;
ALTER TABLE ONLY public.account_emailaddress DROP CONSTRAINT account_emailaddress_pkey;
ALTER TABLE ONLY public.account_emailaddress DROP CONSTRAINT account_emailaddress_email_key;
ALTER TABLE public.socialaccount_socialtoken ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.socialaccount_socialapp_sites ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.socialaccount_socialapp ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.socialaccount_socialaccount ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.organizations_organization ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.organizations_membership ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_video ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_trackedshapeattributeval ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_trackedshape ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_task ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_serverfile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_segment ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_remotefile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_relatedfile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_project ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_manifest ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledtrackattributeval ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledtrack ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledshapeattributeval ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledshape ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledimageattributeval ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_labeledimage ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_label ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_jobcommit ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_job ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_issue ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_image ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_data ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_comment ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_cloudstorage ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_clientfile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.engine_attributespec ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.django_site ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.django_migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.django_content_type ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.django_admin_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_user_user_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_user_groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_user ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_permission ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_group_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auth_group ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.account_emailconfirmation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.account_emailaddress ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.socialaccount_socialtoken_id_seq;
DROP TABLE public.socialaccount_socialtoken;
DROP SEQUENCE public.socialaccount_socialapp_sites_id_seq;
DROP TABLE public.socialaccount_socialapp_sites;
DROP SEQUENCE public.socialaccount_socialapp_id_seq;
DROP TABLE public.socialaccount_socialapp;
DROP SEQUENCE public.socialaccount_socialaccount_id_seq;
DROP TABLE public.socialaccount_socialaccount;
DROP SEQUENCE public.organizations_organization_id_seq;
DROP TABLE public.organizations_organization;
DROP SEQUENCE public.organizations_membership_id_seq;
DROP TABLE public.organizations_membership;
DROP TABLE public.organizations_invitation;
DROP SEQUENCE public.engine_video_id_seq;
DROP TABLE public.engine_video;
DROP SEQUENCE public.engine_trackedshapeattributeval_id_seq;
DROP TABLE public.engine_trackedshapeattributeval;
DROP SEQUENCE public.engine_trackedshape_id_seq;
DROP TABLE public.engine_trackedshape;
DROP SEQUENCE public.engine_task_id_seq;
DROP TABLE public.engine_task;
DROP SEQUENCE public.engine_serverfile_id_seq;
DROP TABLE public.engine_serverfile;
DROP SEQUENCE public.engine_segment_id_seq;
DROP TABLE public.engine_segment;
DROP SEQUENCE public.engine_remotefile_id_seq;
DROP TABLE public.engine_remotefile;
DROP SEQUENCE public.engine_relatedfile_id_seq;
DROP TABLE public.engine_relatedfile;
DROP SEQUENCE public.engine_project_id_seq;
DROP TABLE public.engine_project;
DROP SEQUENCE public.engine_profile_id_seq;
DROP TABLE public.engine_profile;
DROP SEQUENCE public.engine_manifest_id_seq;
DROP TABLE public.engine_manifest;
DROP SEQUENCE public.engine_labeledtrackattributeval_id_seq;
DROP TABLE public.engine_labeledtrackattributeval;
DROP SEQUENCE public.engine_labeledtrack_id_seq;
DROP TABLE public.engine_labeledtrack;
DROP SEQUENCE public.engine_labeledshapeattributeval_id_seq;
DROP TABLE public.engine_labeledshapeattributeval;
DROP SEQUENCE public.engine_labeledshape_id_seq;
DROP TABLE public.engine_labeledshape;
DROP SEQUENCE public.engine_labeledimageattributeval_id_seq;
DROP TABLE public.engine_labeledimageattributeval;
DROP SEQUENCE public.engine_labeledimage_id_seq;
DROP TABLE public.engine_labeledimage;
DROP SEQUENCE public.engine_label_id_seq;
DROP TABLE public.engine_label;
DROP SEQUENCE public.engine_jobcommit_id_seq;
DROP TABLE public.engine_jobcommit;
DROP SEQUENCE public.engine_job_id_seq;
DROP TABLE public.engine_job;
DROP SEQUENCE public.engine_issue_id_seq;
DROP TABLE public.engine_issue;
DROP SEQUENCE public.engine_image_id_seq;
DROP TABLE public.engine_image;
DROP SEQUENCE public.engine_data_id_seq;
DROP TABLE public.engine_data;
DROP SEQUENCE public.engine_comment_id_seq;
DROP TABLE public.engine_comment;
DROP SEQUENCE public.engine_cloudstorage_id_seq;
DROP TABLE public.engine_cloudstorage;
DROP SEQUENCE public.engine_clientfile_id_seq;
DROP TABLE public.engine_clientfile;
DROP SEQUENCE public.engine_attributespec_id_seq;
DROP TABLE public.engine_attributespec;
DROP SEQUENCE public.django_site_id_seq;
DROP TABLE public.django_site;
DROP TABLE public.django_session;
DROP SEQUENCE public.django_migrations_id_seq;
DROP TABLE public.django_migrations;
DROP SEQUENCE public.django_content_type_id_seq;
DROP TABLE public.django_content_type;
DROP SEQUENCE public.django_admin_log_id_seq;
DROP TABLE public.django_admin_log;
DROP TABLE public.dataset_repo_gitdata;
DROP TABLE public.authtoken_token;
DROP SEQUENCE public.auth_user_user_permissions_id_seq;
DROP TABLE public.auth_user_user_permissions;
DROP SEQUENCE public.auth_user_id_seq;
DROP SEQUENCE public.auth_user_groups_id_seq;
DROP TABLE public.auth_user_groups;
DROP TABLE public.auth_user;
DROP SEQUENCE public.auth_permission_id_seq;
DROP TABLE public.auth_permission;
DROP SEQUENCE public.auth_group_permissions_id_seq;
DROP TABLE public.auth_group_permissions;
DROP SEQUENCE public.auth_group_id_seq;
DROP TABLE public.auth_group;
DROP SEQUENCE public.account_emailconfirmation_id_seq;
DROP TABLE public.account_emailconfirmation;
DROP SEQUENCE public.account_emailaddress_id_seq;
DROP TABLE public.account_emailaddress;
DROP EXTENSION plpgsql;
DROP SCHEMA public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO root;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: root
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: account_emailaddress; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.account_emailaddress (
    id integer NOT NULL,
    email character varying(254) NOT NULL,
    verified boolean NOT NULL,
    "primary" boolean NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.account_emailaddress OWNER TO root;

--
-- Name: account_emailaddress_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.account_emailaddress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_emailaddress_id_seq OWNER TO root;

--
-- Name: account_emailaddress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.account_emailaddress_id_seq OWNED BY public.account_emailaddress.id;


--
-- Name: account_emailconfirmation; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.account_emailconfirmation (
    id integer NOT NULL,
    created timestamp with time zone NOT NULL,
    sent timestamp with time zone,
    key character varying(64) NOT NULL,
    email_address_id integer NOT NULL
);


ALTER TABLE public.account_emailconfirmation OWNER TO root;

--
-- Name: account_emailconfirmation_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.account_emailconfirmation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_emailconfirmation_id_seq OWNER TO root;

--
-- Name: account_emailconfirmation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.account_emailconfirmation_id_seq OWNED BY public.account_emailconfirmation.id;


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO root;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_group_id_seq OWNER TO root;

--
-- Name: auth_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_group_id_seq OWNED BY public.auth_group.id;


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_group_permissions (
    id integer NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO root;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_group_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_group_permissions_id_seq OWNER TO root;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_group_permissions_id_seq OWNED BY public.auth_group_permissions.id;


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO root;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_permission_id_seq OWNER TO root;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_permission_id_seq OWNED BY public.auth_permission.id;


--
-- Name: auth_user; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_user (
    id integer NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    username character varying(150) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    email character varying(254) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL
);


ALTER TABLE public.auth_user OWNER TO root;

--
-- Name: auth_user_groups; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_user_groups (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE public.auth_user_groups OWNER TO root;

--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_user_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_user_groups_id_seq OWNER TO root;

--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_user_groups_id_seq OWNED BY public.auth_user_groups.id;


--
-- Name: auth_user_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_user_id_seq OWNER TO root;

--
-- Name: auth_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_user_id_seq OWNED BY public.auth_user.id;


--
-- Name: auth_user_user_permissions; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.auth_user_user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_user_user_permissions OWNER TO root;

--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.auth_user_user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_user_user_permissions_id_seq OWNER TO root;

--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.auth_user_user_permissions_id_seq OWNED BY public.auth_user_user_permissions.id;


--
-- Name: authtoken_token; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.authtoken_token (
    key character varying(40) NOT NULL,
    created timestamp with time zone NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.authtoken_token OWNER TO root;

--
-- Name: dataset_repo_gitdata; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.dataset_repo_gitdata (
    task_id integer NOT NULL,
    url character varying(2000) NOT NULL,
    path character varying(256) NOT NULL,
    sync_date timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    lfs boolean NOT NULL,
    format character varying(256) NOT NULL
);


ALTER TABLE public.dataset_repo_gitdata OWNER TO root;

--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id integer NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO root;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.django_admin_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.django_admin_log_id_seq OWNER TO root;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.django_admin_log_id_seq OWNED BY public.django_admin_log.id;


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO root;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.django_content_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.django_content_type_id_seq OWNER TO root;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.django_content_type_id_seq OWNED BY public.django_content_type.id;


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.django_migrations (
    id integer NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO root;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.django_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.django_migrations_id_seq OWNER TO root;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.django_migrations_id_seq OWNED BY public.django_migrations.id;


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO root;

--
-- Name: django_site; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.django_site (
    id integer NOT NULL,
    domain character varying(100) NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.django_site OWNER TO root;

--
-- Name: django_site_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.django_site_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.django_site_id_seq OWNER TO root;

--
-- Name: django_site_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.django_site_id_seq OWNED BY public.django_site.id;


--
-- Name: engine_attributespec; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_attributespec (
    id integer NOT NULL,
    label_id integer NOT NULL,
    default_value character varying(128) NOT NULL,
    input_type character varying(16) NOT NULL,
    mutable boolean NOT NULL,
    name character varying(64) NOT NULL,
    "values" character varying(4096) NOT NULL
);


ALTER TABLE public.engine_attributespec OWNER TO root;

--
-- Name: engine_attributespec_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_attributespec_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_attributespec_id_seq OWNER TO root;

--
-- Name: engine_attributespec_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_attributespec_id_seq OWNED BY public.engine_attributespec.id;


--
-- Name: engine_clientfile; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_clientfile (
    id integer NOT NULL,
    file character varying(1024) NOT NULL,
    data_id integer
);


ALTER TABLE public.engine_clientfile OWNER TO root;

--
-- Name: engine_clientfile_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_clientfile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_clientfile_id_seq OWNER TO root;

--
-- Name: engine_clientfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_clientfile_id_seq OWNED BY public.engine_clientfile.id;


--
-- Name: engine_cloudstorage; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_cloudstorage (
    id integer NOT NULL,
    provider_type character varying(20) NOT NULL,
    resource character varying(222) NOT NULL,
    display_name character varying(63) NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone NOT NULL,
    credentials character varying(500) NOT NULL,
    credentials_type character varying(29) NOT NULL,
    specific_attributes character varying(128) NOT NULL,
    description text NOT NULL,
    owner_id integer,
    organization_id integer
);


ALTER TABLE public.engine_cloudstorage OWNER TO root;

--
-- Name: engine_cloudstorage_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_cloudstorage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_cloudstorage_id_seq OWNER TO root;

--
-- Name: engine_cloudstorage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_cloudstorage_id_seq OWNED BY public.engine_cloudstorage.id;


--
-- Name: engine_comment; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_comment (
    id integer NOT NULL,
    message text NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone NOT NULL,
    owner_id integer,
    issue_id integer NOT NULL
);


ALTER TABLE public.engine_comment OWNER TO root;

--
-- Name: engine_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_comment_id_seq OWNER TO root;

--
-- Name: engine_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_comment_id_seq OWNED BY public.engine_comment.id;


--
-- Name: engine_data; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_data (
    id integer NOT NULL,
    chunk_size integer,
    size integer NOT NULL,
    image_quality smallint NOT NULL,
    start_frame integer NOT NULL,
    stop_frame integer NOT NULL,
    frame_filter character varying(256) NOT NULL,
    compressed_chunk_type character varying(32) NOT NULL,
    original_chunk_type character varying(32) NOT NULL,
    storage_method character varying(15) NOT NULL,
    storage character varying(15) NOT NULL,
    cloud_storage_id integer,
    sorting_method character varying(15) NOT NULL,
    CONSTRAINT engine_data_chunk_size_check CHECK ((chunk_size >= 0)),
    CONSTRAINT engine_data_image_quality_check CHECK ((image_quality >= 0)),
    CONSTRAINT engine_data_size_check CHECK ((size >= 0)),
    CONSTRAINT engine_data_start_frame_check CHECK ((start_frame >= 0)),
    CONSTRAINT engine_data_stop_frame_check CHECK ((stop_frame >= 0))
);


ALTER TABLE public.engine_data OWNER TO root;

--
-- Name: engine_data_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_data_id_seq OWNER TO root;

--
-- Name: engine_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_data_id_seq OWNED BY public.engine_data.id;


--
-- Name: engine_image; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_image (
    id integer NOT NULL,
    path character varying(1024) NOT NULL,
    frame integer NOT NULL,
    height integer NOT NULL,
    width integer NOT NULL,
    data_id integer,
    CONSTRAINT engine_image_frame_check CHECK ((frame >= 0)),
    CONSTRAINT engine_image_height_check CHECK ((height >= 0)),
    CONSTRAINT engine_image_width_check CHECK ((width >= 0))
);


ALTER TABLE public.engine_image OWNER TO root;

--
-- Name: engine_image_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_image_id_seq OWNER TO root;

--
-- Name: engine_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_image_id_seq OWNED BY public.engine_image.id;


--
-- Name: engine_issue; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_issue (
    id integer NOT NULL,
    frame integer NOT NULL,
    "position" text NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone,
    job_id integer NOT NULL,
    owner_id integer,
    assignee_id integer,
    resolved boolean NOT NULL,
    CONSTRAINT engine_issue_frame_check CHECK ((frame >= 0))
);


ALTER TABLE public.engine_issue OWNER TO root;

--
-- Name: engine_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_issue_id_seq OWNER TO root;

--
-- Name: engine_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_issue_id_seq OWNED BY public.engine_issue.id;


--
-- Name: engine_job; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_job (
    id integer NOT NULL,
    segment_id integer NOT NULL,
    assignee_id integer,
    status character varying(32) NOT NULL,
    stage character varying(32) NOT NULL,
    state character varying(32) NOT NULL
);


ALTER TABLE public.engine_job OWNER TO root;

--
-- Name: engine_job_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_job_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_job_id_seq OWNER TO root;

--
-- Name: engine_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_job_id_seq OWNED BY public.engine_job.id;


--
-- Name: engine_jobcommit; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_jobcommit (
    id bigint NOT NULL,
    version integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    message character varying(4096) NOT NULL,
    owner_id integer,
    job_id integer NOT NULL,
    CONSTRAINT engine_jobcommit_version_check CHECK ((version >= 0))
);


ALTER TABLE public.engine_jobcommit OWNER TO root;

--
-- Name: engine_jobcommit_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_jobcommit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_jobcommit_id_seq OWNER TO root;

--
-- Name: engine_jobcommit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_jobcommit_id_seq OWNED BY public.engine_jobcommit.id;


--
-- Name: engine_label; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_label (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    task_id integer,
    color character varying(8) NOT NULL,
    project_id integer
);


ALTER TABLE public.engine_label OWNER TO root;

--
-- Name: engine_label_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_label_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_label_id_seq OWNER TO root;

--
-- Name: engine_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_label_id_seq OWNED BY public.engine_label.id;


--
-- Name: engine_labeledimage; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledimage (
    id bigint NOT NULL,
    frame integer NOT NULL,
    "group" integer,
    job_id integer NOT NULL,
    label_id integer NOT NULL,
    source character varying(16),
    CONSTRAINT engine_labeledimage_frame_check CHECK ((frame >= 0)),
    CONSTRAINT engine_labeledimage_group_check CHECK (("group" >= 0))
);


ALTER TABLE public.engine_labeledimage OWNER TO root;

--
-- Name: engine_labeledimage_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledimage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledimage_id_seq OWNER TO root;

--
-- Name: engine_labeledimage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledimage_id_seq OWNED BY public.engine_labeledimage.id;


--
-- Name: engine_labeledimageattributeval; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledimageattributeval (
    id bigint NOT NULL,
    value character varying(4096) NOT NULL,
    spec_id integer NOT NULL,
    image_id bigint NOT NULL
);


ALTER TABLE public.engine_labeledimageattributeval OWNER TO root;

--
-- Name: engine_labeledimageattributeval_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledimageattributeval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledimageattributeval_id_seq OWNER TO root;

--
-- Name: engine_labeledimageattributeval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledimageattributeval_id_seq OWNED BY public.engine_labeledimageattributeval.id;


--
-- Name: engine_labeledshape; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledshape (
    id bigint NOT NULL,
    frame integer NOT NULL,
    "group" integer,
    type character varying(16) NOT NULL,
    occluded boolean NOT NULL,
    z_order integer NOT NULL,
    points text NOT NULL,
    job_id integer NOT NULL,
    label_id integer NOT NULL,
    source character varying(16),
    rotation double precision NOT NULL,
    CONSTRAINT engine_labeledshape_frame_check CHECK ((frame >= 0)),
    CONSTRAINT engine_labeledshape_group_check CHECK (("group" >= 0))
);


ALTER TABLE public.engine_labeledshape OWNER TO root;

--
-- Name: engine_labeledshape_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledshape_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledshape_id_seq OWNER TO root;

--
-- Name: engine_labeledshape_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledshape_id_seq OWNED BY public.engine_labeledshape.id;


--
-- Name: engine_labeledshapeattributeval; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledshapeattributeval (
    id bigint NOT NULL,
    value character varying(4096) NOT NULL,
    spec_id integer NOT NULL,
    shape_id bigint NOT NULL
);


ALTER TABLE public.engine_labeledshapeattributeval OWNER TO root;

--
-- Name: engine_labeledshapeattributeval_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledshapeattributeval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledshapeattributeval_id_seq OWNER TO root;

--
-- Name: engine_labeledshapeattributeval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledshapeattributeval_id_seq OWNED BY public.engine_labeledshapeattributeval.id;


--
-- Name: engine_labeledtrack; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledtrack (
    id bigint NOT NULL,
    frame integer NOT NULL,
    "group" integer,
    job_id integer NOT NULL,
    label_id integer NOT NULL,
    source character varying(16),
    CONSTRAINT engine_labeledtrack_frame_check CHECK ((frame >= 0)),
    CONSTRAINT engine_labeledtrack_group_check CHECK (("group" >= 0))
);


ALTER TABLE public.engine_labeledtrack OWNER TO root;

--
-- Name: engine_labeledtrack_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledtrack_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledtrack_id_seq OWNER TO root;

--
-- Name: engine_labeledtrack_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledtrack_id_seq OWNED BY public.engine_labeledtrack.id;


--
-- Name: engine_labeledtrackattributeval; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_labeledtrackattributeval (
    id bigint NOT NULL,
    value character varying(4096) NOT NULL,
    spec_id integer NOT NULL,
    track_id bigint NOT NULL
);


ALTER TABLE public.engine_labeledtrackattributeval OWNER TO root;

--
-- Name: engine_labeledtrackattributeval_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_labeledtrackattributeval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_labeledtrackattributeval_id_seq OWNER TO root;

--
-- Name: engine_labeledtrackattributeval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_labeledtrackattributeval_id_seq OWNED BY public.engine_labeledtrackattributeval.id;


--
-- Name: engine_manifest; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_manifest (
    id integer NOT NULL,
    filename character varying(1024) NOT NULL,
    cloud_storage_id integer
);


ALTER TABLE public.engine_manifest OWNER TO root;

--
-- Name: engine_manifest_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_manifest_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_manifest_id_seq OWNER TO root;

--
-- Name: engine_manifest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_manifest_id_seq OWNED BY public.engine_manifest.id;


--
-- Name: engine_profile; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_profile (
    id integer NOT NULL,
    rating double precision NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.engine_profile OWNER TO root;

--
-- Name: engine_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_profile_id_seq OWNER TO root;

--
-- Name: engine_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_profile_id_seq OWNED BY public.engine_profile.id;


--
-- Name: engine_project; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_project (
    id integer NOT NULL,
    name character varying(256) NOT NULL,
    bug_tracker character varying(2000) NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone NOT NULL,
    status character varying(32) NOT NULL,
    assignee_id integer,
    owner_id integer,
    organization_id integer
);


ALTER TABLE public.engine_project OWNER TO root;

--
-- Name: engine_project_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_project_id_seq OWNER TO root;

--
-- Name: engine_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_project_id_seq OWNED BY public.engine_project.id;


--
-- Name: engine_relatedfile; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_relatedfile (
    id integer NOT NULL,
    path character varying(1024) NOT NULL,
    data_id integer,
    primary_image_id integer
);


ALTER TABLE public.engine_relatedfile OWNER TO root;

--
-- Name: engine_relatedfile_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_relatedfile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_relatedfile_id_seq OWNER TO root;

--
-- Name: engine_relatedfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_relatedfile_id_seq OWNED BY public.engine_relatedfile.id;


--
-- Name: engine_remotefile; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_remotefile (
    id integer NOT NULL,
    file character varying(1024) NOT NULL,
    data_id integer
);


ALTER TABLE public.engine_remotefile OWNER TO root;

--
-- Name: engine_remotefile_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_remotefile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_remotefile_id_seq OWNER TO root;

--
-- Name: engine_remotefile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_remotefile_id_seq OWNED BY public.engine_remotefile.id;


--
-- Name: engine_segment; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_segment (
    id integer NOT NULL,
    start_frame integer NOT NULL,
    stop_frame integer NOT NULL,
    task_id integer NOT NULL
);


ALTER TABLE public.engine_segment OWNER TO root;

--
-- Name: engine_segment_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_segment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_segment_id_seq OWNER TO root;

--
-- Name: engine_segment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_segment_id_seq OWNED BY public.engine_segment.id;


--
-- Name: engine_serverfile; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_serverfile (
    id integer NOT NULL,
    file character varying(1024) NOT NULL,
    data_id integer
);


ALTER TABLE public.engine_serverfile OWNER TO root;

--
-- Name: engine_serverfile_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_serverfile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_serverfile_id_seq OWNER TO root;

--
-- Name: engine_serverfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_serverfile_id_seq OWNED BY public.engine_serverfile.id;


--
-- Name: engine_task; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_task (
    id integer NOT NULL,
    name character varying(256) NOT NULL,
    mode character varying(32) NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone NOT NULL,
    status character varying(32) NOT NULL,
    bug_tracker character varying(2000) NOT NULL,
    owner_id integer,
    overlap integer,
    assignee_id integer,
    segment_size integer NOT NULL,
    project_id integer,
    data_id integer,
    dimension character varying(2) NOT NULL,
    subset character varying(64) NOT NULL,
    organization_id integer,
    CONSTRAINT engine_task_overlap_check CHECK ((overlap >= 0)),
    CONSTRAINT engine_task_segment_size_check CHECK ((segment_size >= 0))
);


ALTER TABLE public.engine_task OWNER TO root;

--
-- Name: engine_task_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_task_id_seq OWNER TO root;

--
-- Name: engine_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_task_id_seq OWNED BY public.engine_task.id;


--
-- Name: engine_trackedshape; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_trackedshape (
    type character varying(16) NOT NULL,
    occluded boolean NOT NULL,
    z_order integer NOT NULL,
    points text NOT NULL,
    id bigint NOT NULL,
    frame integer NOT NULL,
    outside boolean NOT NULL,
    track_id bigint NOT NULL,
    rotation double precision NOT NULL,
    CONSTRAINT engine_trackedshape_frame_check CHECK ((frame >= 0))
);


ALTER TABLE public.engine_trackedshape OWNER TO root;

--
-- Name: engine_trackedshape_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_trackedshape_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_trackedshape_id_seq OWNER TO root;

--
-- Name: engine_trackedshape_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_trackedshape_id_seq OWNED BY public.engine_trackedshape.id;


--
-- Name: engine_trackedshapeattributeval; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_trackedshapeattributeval (
    id bigint NOT NULL,
    value character varying(4096) NOT NULL,
    shape_id bigint NOT NULL,
    spec_id integer NOT NULL
);


ALTER TABLE public.engine_trackedshapeattributeval OWNER TO root;

--
-- Name: engine_trackedshapeattributeval_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_trackedshapeattributeval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_trackedshapeattributeval_id_seq OWNER TO root;

--
-- Name: engine_trackedshapeattributeval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_trackedshapeattributeval_id_seq OWNED BY public.engine_trackedshapeattributeval.id;


--
-- Name: engine_video; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.engine_video (
    id integer NOT NULL,
    path character varying(1024) NOT NULL,
    height integer NOT NULL,
    width integer NOT NULL,
    data_id integer,
    CONSTRAINT engine_video_height_check CHECK ((height >= 0)),
    CONSTRAINT engine_video_width_check CHECK ((width >= 0))
);


ALTER TABLE public.engine_video OWNER TO root;

--
-- Name: engine_video_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.engine_video_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engine_video_id_seq OWNER TO root;

--
-- Name: engine_video_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.engine_video_id_seq OWNED BY public.engine_video.id;


--
-- Name: organizations_invitation; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.organizations_invitation (
    key character varying(64) NOT NULL,
    created_date timestamp with time zone NOT NULL,
    membership_id integer NOT NULL,
    owner_id integer
);


ALTER TABLE public.organizations_invitation OWNER TO root;

--
-- Name: organizations_membership; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.organizations_membership (
    id integer NOT NULL,
    is_active boolean NOT NULL,
    joined_date timestamp with time zone,
    role character varying(16) NOT NULL,
    organization_id integer NOT NULL,
    user_id integer
);


ALTER TABLE public.organizations_membership OWNER TO root;

--
-- Name: organizations_membership_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.organizations_membership_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_membership_id_seq OWNER TO root;

--
-- Name: organizations_membership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.organizations_membership_id_seq OWNED BY public.organizations_membership.id;


--
-- Name: organizations_organization; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.organizations_organization (
    id integer NOT NULL,
    slug character varying(16) NOT NULL,
    name character varying(64) NOT NULL,
    description text NOT NULL,
    created_date timestamp with time zone NOT NULL,
    updated_date timestamp with time zone NOT NULL,
    contact jsonb NOT NULL,
    owner_id integer
);


ALTER TABLE public.organizations_organization OWNER TO root;

--
-- Name: organizations_organization_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.organizations_organization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_organization_id_seq OWNER TO root;

--
-- Name: organizations_organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.organizations_organization_id_seq OWNED BY public.organizations_organization.id;


--
-- Name: socialaccount_socialaccount; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.socialaccount_socialaccount (
    id integer NOT NULL,
    provider character varying(30) NOT NULL,
    uid character varying(191) NOT NULL,
    last_login timestamp with time zone NOT NULL,
    date_joined timestamp with time zone NOT NULL,
    extra_data text NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.socialaccount_socialaccount OWNER TO root;

--
-- Name: socialaccount_socialaccount_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.socialaccount_socialaccount_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.socialaccount_socialaccount_id_seq OWNER TO root;

--
-- Name: socialaccount_socialaccount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.socialaccount_socialaccount_id_seq OWNED BY public.socialaccount_socialaccount.id;


--
-- Name: socialaccount_socialapp; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.socialaccount_socialapp (
    id integer NOT NULL,
    provider character varying(30) NOT NULL,
    name character varying(40) NOT NULL,
    client_id character varying(191) NOT NULL,
    secret character varying(191) NOT NULL,
    key character varying(191) NOT NULL
);


ALTER TABLE public.socialaccount_socialapp OWNER TO root;

--
-- Name: socialaccount_socialapp_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.socialaccount_socialapp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.socialaccount_socialapp_id_seq OWNER TO root;

--
-- Name: socialaccount_socialapp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.socialaccount_socialapp_id_seq OWNED BY public.socialaccount_socialapp.id;


--
-- Name: socialaccount_socialapp_sites; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.socialaccount_socialapp_sites (
    id integer NOT NULL,
    socialapp_id integer NOT NULL,
    site_id integer NOT NULL
);


ALTER TABLE public.socialaccount_socialapp_sites OWNER TO root;

--
-- Name: socialaccount_socialapp_sites_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.socialaccount_socialapp_sites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.socialaccount_socialapp_sites_id_seq OWNER TO root;

--
-- Name: socialaccount_socialapp_sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.socialaccount_socialapp_sites_id_seq OWNED BY public.socialaccount_socialapp_sites.id;


--
-- Name: socialaccount_socialtoken; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.socialaccount_socialtoken (
    id integer NOT NULL,
    token text NOT NULL,
    token_secret text NOT NULL,
    expires_at timestamp with time zone,
    account_id integer NOT NULL,
    app_id integer NOT NULL
);


ALTER TABLE public.socialaccount_socialtoken OWNER TO root;

--
-- Name: socialaccount_socialtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: root
--

CREATE SEQUENCE public.socialaccount_socialtoken_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.socialaccount_socialtoken_id_seq OWNER TO root;

--
-- Name: socialaccount_socialtoken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: root
--

ALTER SEQUENCE public.socialaccount_socialtoken_id_seq OWNED BY public.socialaccount_socialtoken.id;


--
-- Name: account_emailaddress id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailaddress ALTER COLUMN id SET DEFAULT nextval('public.account_emailaddress_id_seq'::regclass);


--
-- Name: account_emailconfirmation id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailconfirmation ALTER COLUMN id SET DEFAULT nextval('public.account_emailconfirmation_id_seq'::regclass);


--
-- Name: auth_group id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group ALTER COLUMN id SET DEFAULT nextval('public.auth_group_id_seq'::regclass);


--
-- Name: auth_group_permissions id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group_permissions ALTER COLUMN id SET DEFAULT nextval('public.auth_group_permissions_id_seq'::regclass);


--
-- Name: auth_permission id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_permission ALTER COLUMN id SET DEFAULT nextval('public.auth_permission_id_seq'::regclass);


--
-- Name: auth_user id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user ALTER COLUMN id SET DEFAULT nextval('public.auth_user_id_seq'::regclass);


--
-- Name: auth_user_groups id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_groups ALTER COLUMN id SET DEFAULT nextval('public.auth_user_groups_id_seq'::regclass);


--
-- Name: auth_user_user_permissions id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_user_permissions ALTER COLUMN id SET DEFAULT nextval('public.auth_user_user_permissions_id_seq'::regclass);


--
-- Name: django_admin_log id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_admin_log ALTER COLUMN id SET DEFAULT nextval('public.django_admin_log_id_seq'::regclass);


--
-- Name: django_content_type id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_content_type ALTER COLUMN id SET DEFAULT nextval('public.django_content_type_id_seq'::regclass);


--
-- Name: django_migrations id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_migrations ALTER COLUMN id SET DEFAULT nextval('public.django_migrations_id_seq'::regclass);


--
-- Name: django_site id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_site ALTER COLUMN id SET DEFAULT nextval('public.django_site_id_seq'::regclass);


--
-- Name: engine_attributespec id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_attributespec ALTER COLUMN id SET DEFAULT nextval('public.engine_attributespec_id_seq'::regclass);


--
-- Name: engine_clientfile id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_clientfile ALTER COLUMN id SET DEFAULT nextval('public.engine_clientfile_id_seq'::regclass);


--
-- Name: engine_cloudstorage id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_cloudstorage ALTER COLUMN id SET DEFAULT nextval('public.engine_cloudstorage_id_seq'::regclass);


--
-- Name: engine_comment id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_comment ALTER COLUMN id SET DEFAULT nextval('public.engine_comment_id_seq'::regclass);


--
-- Name: engine_data id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_data ALTER COLUMN id SET DEFAULT nextval('public.engine_data_id_seq'::regclass);


--
-- Name: engine_image id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_image ALTER COLUMN id SET DEFAULT nextval('public.engine_image_id_seq'::regclass);


--
-- Name: engine_issue id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_issue ALTER COLUMN id SET DEFAULT nextval('public.engine_issue_id_seq'::regclass);


--
-- Name: engine_job id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_job ALTER COLUMN id SET DEFAULT nextval('public.engine_job_id_seq'::regclass);


--
-- Name: engine_jobcommit id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_jobcommit ALTER COLUMN id SET DEFAULT nextval('public.engine_jobcommit_id_seq'::regclass);


--
-- Name: engine_label id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_label ALTER COLUMN id SET DEFAULT nextval('public.engine_label_id_seq'::regclass);


--
-- Name: engine_labeledimage id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimage ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledimage_id_seq'::regclass);


--
-- Name: engine_labeledimageattributeval id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimageattributeval ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledimageattributeval_id_seq'::regclass);


--
-- Name: engine_labeledshape id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshape ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledshape_id_seq'::regclass);


--
-- Name: engine_labeledshapeattributeval id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshapeattributeval ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledshapeattributeval_id_seq'::regclass);


--
-- Name: engine_labeledtrack id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrack ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledtrack_id_seq'::regclass);


--
-- Name: engine_labeledtrackattributeval id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrackattributeval ALTER COLUMN id SET DEFAULT nextval('public.engine_labeledtrackattributeval_id_seq'::regclass);


--
-- Name: engine_manifest id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_manifest ALTER COLUMN id SET DEFAULT nextval('public.engine_manifest_id_seq'::regclass);


--
-- Name: engine_profile id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_profile ALTER COLUMN id SET DEFAULT nextval('public.engine_profile_id_seq'::regclass);


--
-- Name: engine_project id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_project ALTER COLUMN id SET DEFAULT nextval('public.engine_project_id_seq'::regclass);


--
-- Name: engine_relatedfile id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_relatedfile ALTER COLUMN id SET DEFAULT nextval('public.engine_relatedfile_id_seq'::regclass);


--
-- Name: engine_remotefile id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_remotefile ALTER COLUMN id SET DEFAULT nextval('public.engine_remotefile_id_seq'::regclass);


--
-- Name: engine_segment id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_segment ALTER COLUMN id SET DEFAULT nextval('public.engine_segment_id_seq'::regclass);


--
-- Name: engine_serverfile id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_serverfile ALTER COLUMN id SET DEFAULT nextval('public.engine_serverfile_id_seq'::regclass);


--
-- Name: engine_task id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task ALTER COLUMN id SET DEFAULT nextval('public.engine_task_id_seq'::regclass);


--
-- Name: engine_trackedshape id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshape ALTER COLUMN id SET DEFAULT nextval('public.engine_trackedshape_id_seq'::regclass);


--
-- Name: engine_trackedshapeattributeval id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshapeattributeval ALTER COLUMN id SET DEFAULT nextval('public.engine_trackedshapeattributeval_id_seq'::regclass);


--
-- Name: engine_video id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_video ALTER COLUMN id SET DEFAULT nextval('public.engine_video_id_seq'::regclass);


--
-- Name: organizations_membership id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_membership ALTER COLUMN id SET DEFAULT nextval('public.organizations_membership_id_seq'::regclass);


--
-- Name: organizations_organization id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_organization ALTER COLUMN id SET DEFAULT nextval('public.organizations_organization_id_seq'::regclass);


--
-- Name: socialaccount_socialaccount id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialaccount ALTER COLUMN id SET DEFAULT nextval('public.socialaccount_socialaccount_id_seq'::regclass);


--
-- Name: socialaccount_socialapp id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp ALTER COLUMN id SET DEFAULT nextval('public.socialaccount_socialapp_id_seq'::regclass);


--
-- Name: socialaccount_socialapp_sites id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp_sites ALTER COLUMN id SET DEFAULT nextval('public.socialaccount_socialapp_sites_id_seq'::regclass);


--
-- Name: socialaccount_socialtoken id; Type: DEFAULT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialtoken ALTER COLUMN id SET DEFAULT nextval('public.socialaccount_socialtoken_id_seq'::regclass);


--
-- Data for Name: account_emailaddress; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.account_emailaddress (id, email, verified, "primary", user_id) FROM stdin;
\.


--
-- Data for Name: account_emailconfirmation; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.account_emailconfirmation (id, created, sent, key, email_address_id) FROM stdin;
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_group (id, name) FROM stdin;
1	admin
2	business
3	user
4	worker
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add user	4	add_user
14	Can change user	4	change_user
15	Can delete user	4	delete_user
16	Can view user	4	view_user
17	Can add content type	5	add_contenttype
18	Can change content type	5	change_contenttype
19	Can delete content type	5	delete_contenttype
20	Can view content type	5	view_contenttype
21	Can add session	6	add_session
22	Can change session	6	change_session
23	Can delete session	6	delete_session
24	Can view session	6	view_session
25	Can add Token	7	add_token
26	Can change Token	7	change_token
27	Can delete Token	7	delete_token
28	Can view Token	7	view_token
29	Can add token	8	add_tokenproxy
30	Can change token	8	change_tokenproxy
31	Can delete token	8	delete_tokenproxy
32	Can view token	8	view_tokenproxy
33	Can add site	9	add_site
34	Can change site	9	change_site
35	Can delete site	9	delete_site
36	Can view site	9	view_site
37	Can add email address	10	add_emailaddress
38	Can change email address	10	change_emailaddress
39	Can delete email address	10	delete_emailaddress
40	Can view email address	10	view_emailaddress
41	Can add email confirmation	11	add_emailconfirmation
42	Can change email confirmation	11	change_emailconfirmation
43	Can delete email confirmation	11	delete_emailconfirmation
44	Can view email confirmation	11	view_emailconfirmation
45	Can add social account	12	add_socialaccount
46	Can change social account	12	change_socialaccount
47	Can delete social account	12	delete_socialaccount
48	Can view social account	12	view_socialaccount
49	Can add social application	13	add_socialapp
50	Can change social application	13	change_socialapp
51	Can delete social application	13	delete_socialapp
52	Can view social application	13	view_socialapp
53	Can add social application token	14	add_socialtoken
54	Can change social application token	14	change_socialtoken
55	Can delete social application token	14	delete_socialtoken
56	Can view social application token	14	view_socialtoken
57	Can add profile	39	add_profile
58	Can change profile	39	change_profile
59	Can delete profile	39	delete_profile
60	Can view profile	39	view_profile
61	Can add issue	40	add_issue
62	Can change issue	40	change_issue
63	Can delete issue	40	delete_issue
64	Can view issue	40	view_issue
65	Can add comment	41	add_comment
66	Can change comment	41	change_comment
67	Can delete comment	41	delete_comment
68	Can view comment	41	view_comment
69	Can add training project	43	add_trainingproject
70	Can change training project	43	change_trainingproject
71	Can delete training project	43	delete_trainingproject
72	Can view training project	43	view_trainingproject
73	Can add training project label	44	add_trainingprojectlabel
74	Can change training project label	44	change_trainingprojectlabel
75	Can delete training project label	44	delete_trainingprojectlabel
76	Can view training project label	44	view_trainingprojectlabel
77	Can add training project image	45	add_trainingprojectimage
78	Can change training project image	45	change_trainingprojectimage
79	Can delete training project image	45	delete_trainingprojectimage
80	Can view training project image	45	view_trainingprojectimage
81	Can add manifest	47	add_manifest
82	Can change manifest	47	change_manifest
83	Can delete manifest	47	delete_manifest
84	Can view manifest	47	view_manifest
85	Can add git data	48	add_gitdata
86	Can change git data	48	change_gitdata
87	Can delete git data	48	delete_gitdata
88	Can view git data	48	view_gitdata
\.


--
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) FROM stdin;
3	pbkdf2_sha256$260000$9YZSJ0xF4Kvjsm2Fwflciy$zRpcqAMLaJBbqTRS09NkZovOHtcdy6haZxu++AeoWFo=	\N	f	user2	User	Second	user2@cvat.org	f	t	2021-12-14 18:24:12+00
4	pbkdf2_sha256$260000$100pcg3A4DB6ewFLQFhfc8$YokGMdr0t2ZayTurcYpUyjaCbN4CeHPkoLCv5krrAhw=	\N	f	user3	User	Third	user3@cvat.org	f	t	2021-12-14 18:24:39+00
5	pbkdf2_sha256$260000$O87TrQZ5e1FdAjz2K5Xn3q$czWORxw/fCBgnZAEVjX/ki7JRHCsnaqRimCGYmULKfc=	\N	f	user4	User	Fourth	user4@cvat.org	f	t	2021-12-14 18:25:10+00
7	pbkdf2_sha256$260000$EtdCZTYNPHPX50kM67A7kA$JxuHkmB25RkeMszSV9Pd58E9AFdSu3Rx2UYSAKu/q4k=	\N	f	worker2	Worker	Second	worker2@cvat.org	f	t	2021-12-14 18:30:43+00
8	pbkdf2_sha256$260000$PNnmu5EKgxZCY9HQgNLfta$JjsE9zrFYJ3ISUHANjjwnxuiGNRGIyVamqnqrkqR9fQ=	\N	f	worker3	Worker	Third	worker3@cvat.org	f	t	2021-12-14 18:31:25+00
9	pbkdf2_sha256$260000$ipL3D6HSba1Cn7pzb5Q7bh$OFx/xO6Q3Q5sBGq3W3MBsmqFhVjkPmVVfaQdnJ8FAtg=	\N	f	worker4	Worker	Fourth	worker4@cvat.org	f	t	2021-12-14 18:32:01+00
11	pbkdf2_sha256$260000$Zw76ANIvIsDngZGsTv2G8O$piTVoqHrpTskW8rI1FBT9rzM2dcpjhrcOfI3pDgtjbo=	\N	f	business2	Business	Second	business2@cvat.org	f	t	2021-12-14 18:34:01+00
12	pbkdf2_sha256$260000$KcNRm6RwodBaGfWhh7ngqB$SsKUBx7vF1Ee0WBDwExd/JI39w1Ee0cBoox7lqNbhCk=	\N	f	business3	Business	Third	business3@cvat.org	f	t	2021-12-14 18:34:34+00
13	pbkdf2_sha256$260000$BbdWU6TKtVfIAW00Dk4Qyb$mkqf3VrZULPrzfH5NFEeEYCnzBPLaBBsVgdeTCve4lA=	\N	f	business4	Business	Fourth	business4@cvat.org	f	t	2021-12-14 18:35:15+00
14	pbkdf2_sha256$260000$47xWwGNsT3dvBc1qZDcLvC$fLC2y72acILlhGFiVp3nA/bnCxY/mRb7xOqOh7Es95k=	\N	f	dummy1	Dummy	First	dummy1@cvat.org	f	t	2021-12-14 18:36:00+00
15	pbkdf2_sha256$260000$g0en7cElWDD2HJlVV2Vhns$U7eJco9WdvEy/GDpZcoGu2rGGF+3TIMS0v/aRaCqWwo=	\N	f	dummy2	Dummy	Second	dummy2@cvat.org	f	t	2021-12-14 18:36:31+00
16	pbkdf2_sha256$260000$48BDv2UDlqhl8DUBc73KiH$Sl4mklcY7vuFyhZh9y1XozQbb35xT3ZgYAUhrUqpV6c=	\N	f	dummy3	Dummy	Third	dummy3@cvat.org	f	t	2021-12-14 18:37:09+00
17	pbkdf2_sha256$260000$ZgcuAD4y4yevdl8uH9uDkv$D89cXpicXu+B4Vs+Nlew/sXYpZvO4kOO1IMoyYs1AvE=	\N	f	dummy4	Dummy	Fourth	dummy4@cvat.org	f	t	2021-12-14 18:37:41+00
18	pbkdf2_sha256$260000$uOqP32bk2zHuvO0sdGBGmu$hMbzA1yBWcY5rIU670sZ3SHXRLUa7bCkbrMnrEDGSRM=	\N	t	admin2	Admin	Second	admin2@cvat.org	t	t	2021-12-14 18:38:46+00
6	pbkdf2_sha256$260000$15iUjDNh5gPg5683u1HhOG$fF8hW6AR90o9SCsO/MomzdQFkgQsMUW3YQUlwwiC1vA=	2021-12-14 19:11:21.04874+00	f	worker1	Worker	First	worker1@cvat.org	f	t	2021-12-14 18:30:00+00
2	pbkdf2_sha256$260000$Pf2xYWXBedoAJ504jyDD8e$8sJ244Ai0xhZrUTelapPNHlEg7CV0cCUaxbcxZtfaug=	2021-12-22 07:55:35.269206+00	f	user1	User	First	user1@cvat.org	f	t	2021-12-14 18:21:09+00
10	pbkdf2_sha256$260000$X4F89IRqnBtojZuHidrwQG$j1+EpXfyvMesHdod4N+dNUfF4WKS2NWFfeGDec/43as=	2022-01-19 13:52:59.477881+00	f	business1	Business	First	business1@cvat.org	f	t	2021-12-14 18:33:06+00
1	pbkdf2_sha256$260000$DevmxlmLwciP1P6sZs2Qag$U9DFtjTWx96Sk95qY6UXVcvpdQEP2LcoFBftk5D2RKY=	2022-02-11 14:54:28.083729+00	t	admin1	Admin	First	admin1@cvat.org	t	t	2021-12-14 18:04:57+00
\.


--
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_user_groups (id, user_id, group_id) FROM stdin;
1	1	1
4	2	3
5	3	3
6	4	3
7	5	3
9	6	4
11	7	4
13	8	4
15	9	4
17	10	2
19	11	2
21	12	2
23	13	2
31	18	1
\.


--
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.auth_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: authtoken_token; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.authtoken_token (key, created, user_id) FROM stdin;
a959159194c4b5238d95ef4e07919110fab346b0	2021-12-14 19:44:48.519942+00	10
f952dc4730c58346882176f775ccaaf2a1c72416	2021-12-22 08:11:58.498742+00	1
\.


--
-- Data for Name: dataset_repo_gitdata; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.dataset_repo_gitdata (task_id, url, path, sync_date, status, lfs, format) FROM stdin;
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
1	2021-12-14 18:20:01.999685+00	1	admin	2	[{"changed": {"fields": ["Email address"]}}]	4	1
2	2021-12-14 18:21:09.151512+00	2	user1	1	[{"added": {}}]	4	1
3	2021-12-14 18:23:58.718016+00	2	user1	2	[{"changed": {"fields": ["First name", "Last name", "Email address"]}}]	4	1
4	2021-12-14 18:24:12.553502+00	3	user2	1	[{"added": {}}]	4	1
5	2021-12-14 18:24:24.326834+00	3	user2	2	[{"changed": {"fields": ["First name", "Last name", "Email address"]}}]	4	1
6	2021-12-14 18:24:39.624768+00	4	user3	1	[{"added": {}}]	4	1
7	2021-12-14 18:24:53.704458+00	4	user3	2	[{"changed": {"fields": ["First name", "Last name", "Email address"]}}]	4	1
8	2021-12-14 18:25:10.952908+00	5	user4	1	[{"added": {}}]	4	1
9	2021-12-14 18:25:31.451721+00	5	user4	2	[{"changed": {"fields": ["First name", "Last name", "Email address"]}}]	4	1
10	2021-12-14 18:30:00.390031+00	6	worker1	1	[{"added": {}}]	4	1
11	2021-12-14 18:30:20.019995+00	6	worker1	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
12	2021-12-14 18:30:43.380691+00	7	worker2	1	[{"added": {}}]	4	1
13	2021-12-14 18:31:05.739605+00	7	worker2	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
14	2021-12-14 18:31:25.912795+00	8	worker3	1	[{"added": {}}]	4	1
15	2021-12-14 18:31:46.096822+00	8	worker3	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
16	2021-12-14 18:32:01.519456+00	9	worker4	1	[{"added": {}}]	4	1
17	2021-12-14 18:32:21.067181+00	9	worker4	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
18	2021-12-14 18:33:06.933223+00	10	business1	1	[{"added": {}}]	4	1
19	2021-12-14 18:33:12.541037+00	10	business1	2	[{"changed": {"fields": ["First name", "Last name"]}}]	4	1
20	2021-12-14 18:33:28.422176+00	10	business1	2	[{"changed": {"fields": ["Last name", "Email address", "Groups"]}}]	4	1
21	2021-12-14 18:34:02.007251+00	11	business2	1	[{"added": {}}]	4	1
22	2021-12-14 18:34:18.560535+00	11	business2	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
23	2021-12-14 18:34:34.313002+00	12	business3	1	[{"added": {}}]	4	1
24	2021-12-14 18:34:54.186415+00	12	business3	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
25	2021-12-14 18:35:15.352514+00	13	business4	1	[{"added": {}}]	4	1
26	2021-12-14 18:35:31.459507+00	13	business4	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
27	2021-12-14 18:36:00.882778+00	14	dummy1	1	[{"added": {}}]	4	1
28	2021-12-14 18:36:16.686238+00	14	dummy1	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
29	2021-12-14 18:36:31.775943+00	15	dummy2	1	[{"added": {}}]	4	1
30	2021-12-14 18:36:47.117011+00	15	dummy2	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
31	2021-12-14 18:37:09.321532+00	16	dummy3	1	[{"added": {}}]	4	1
32	2021-12-14 18:37:25.887032+00	16	dummy3	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
33	2021-12-14 18:37:41.262279+00	17	dummy4	1	[{"added": {}}]	4	1
34	2021-12-14 18:38:00.903794+00	17	dummy4	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
35	2021-12-14 18:38:21.968081+00	1	admin1	2	[{"changed": {"fields": ["Username", "First name", "Last name", "Email address"]}}]	4	1
36	2021-12-14 18:38:27.813262+00	1	admin1	2	[{"changed": {"fields": ["Last name"]}}]	4	1
37	2021-12-14 18:38:46.549655+00	18	admin2	1	[{"added": {}}]	4	1
38	2021-12-14 18:39:13.940795+00	18	admin2	2	[{"changed": {"fields": ["First name", "Last name", "Email address", "Groups"]}}]	4	1
39	2021-12-14 18:41:27.383994+00	18	admin2	2	[{"changed": {"fields": ["Staff status", "Superuser status"]}}]	4	1
40	2021-12-14 18:41:37.492062+00	18	admin2	2	[{"changed": {"fields": ["password"]}}]	4	1
41	2021-12-14 18:41:50.468234+00	1	admin1	2	[{"changed": {"fields": ["password"]}}]	4	1
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	auth	user
5	contenttypes	contenttype
6	sessions	session
7	authtoken	token
8	authtoken	tokenproxy
9	sites	site
10	account	emailaddress
11	account	emailconfirmation
12	socialaccount	socialaccount
13	socialaccount	socialapp
14	socialaccount	socialtoken
15	organizations	organization
16	organizations	membership
17	organizations	invitation
18	engine	attributespec
19	engine	job
20	engine	label
21	engine	segment
22	engine	task
23	engine	clientfile
24	engine	remotefile
25	engine	serverfile
26	engine	image
27	engine	video
28	engine	labeledimageattributeval
29	engine	labeledshapeattributeval
30	engine	labeledtrackattributeval
31	engine	trackedshape
32	engine	trackedshapeattributeval
33	engine	labeledimage
34	engine	labeledshape
35	engine	labeledtrack
36	engine	jobcommit
37	engine	project
38	engine	data
39	engine	profile
40	engine	issue
41	engine	comment
42	engine	relatedfile
43	engine	trainingproject
44	engine	trainingprojectlabel
45	engine	trainingprojectimage
46	engine	cloudstorage
47	engine	manifest
48	dataset_repo	gitdata
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2021-12-14 17:51:20.865248+00
2	auth	0001_initial	2021-12-14 17:51:20.989796+00
3	account	0001_initial	2021-12-14 17:51:21.060941+00
4	account	0002_email_max_length	2021-12-14 17:51:21.081752+00
5	admin	0001_initial	2021-12-14 17:51:21.169986+00
6	admin	0002_logentry_remove_auto_add	2021-12-14 17:51:21.175501+00
7	admin	0003_logentry_add_action_flag_choices	2021-12-14 17:51:21.181026+00
8	contenttypes	0002_remove_content_type_name	2021-12-14 17:51:21.191453+00
9	auth	0002_alter_permission_name_max_length	2021-12-14 17:51:21.197509+00
10	auth	0003_alter_user_email_max_length	2021-12-14 17:51:21.203842+00
11	auth	0004_alter_user_username_opts	2021-12-14 17:51:21.209334+00
12	auth	0005_alter_user_last_login_null	2021-12-14 17:51:21.215101+00
13	auth	0006_require_contenttypes_0002	2021-12-14 17:51:21.216991+00
14	auth	0007_alter_validators_add_error_messages	2021-12-14 17:51:21.22246+00
15	auth	0008_alter_user_username_max_length	2021-12-14 17:51:21.232206+00
16	auth	0009_alter_user_last_name_max_length	2021-12-14 17:51:21.237755+00
17	auth	0010_alter_group_name_max_length	2021-12-14 17:51:21.244143+00
18	auth	0011_update_proxy_permissions	2021-12-14 17:51:21.25077+00
19	auth	0012_alter_user_first_name_max_length	2021-12-14 17:51:21.256149+00
20	authtoken	0001_initial	2021-12-14 17:51:21.273024+00
21	authtoken	0002_auto_20160226_1747	2021-12-14 17:51:21.291594+00
22	authtoken	0003_tokenproxy	2021-12-14 17:51:21.294089+00
23	engine	0001_release_v0_1_0	2021-12-14 17:51:21.571161+00
24	engine	0002_labeledpoints_labeledpointsattributeval_labeledpolygon_labeledpolygonattributeval_labeledpolyline_la	2021-12-14 17:51:21.894205+00
25	engine	0003_objectpath_shapes	2021-12-14 17:51:21.932331+00
26	engine	0004_task_z_order	2021-12-14 17:51:21.955835+00
27	engine	0005_auto_20180609_1512	2021-12-14 17:51:22.122032+00
28	engine	0006_auto_20180629_1501	2021-12-14 17:51:22.236558+00
29	engine	0007_task_flipped	2021-12-14 17:51:22.257002+00
30	engine	0008_auto_20180917_1424	2021-12-14 17:51:22.274168+00
31	engine	0009_auto_20180917_1424	2021-12-14 17:51:22.999581+00
32	engine	0010_auto_20181011_1517	2021-12-14 17:51:23.128611+00
33	engine	0011_add_task_source_and_safecharfield	2021-12-14 17:51:23.210334+00
34	engine	0012_auto_20181025_1618	2021-12-14 17:51:23.235041+00
35	engine	0013_auth_no_default_permissions	2021-12-14 17:51:23.398062+00
36	engine	0014_job_max_shape_id	2021-12-14 17:51:23.417645+00
37	git	0001_initial	2021-12-14 17:51:23.442071+00
38	git	0002_auto_20190123_1305	2021-12-14 17:51:23.447964+00
39	git	0003_gitdata_lfs	2021-12-14 17:51:23.461072+00
40	dataset_repo	0004_rename	2021-12-14 17:51:23.481463+00
41	dataset_repo	0005_auto_20201019_1100	2021-12-14 17:51:23.486946+00
42	dataset_repo	0006_gitdata_format	2021-12-14 17:51:23.514261+00
43	organizations	0001_initial	2021-12-14 17:51:23.612788+00
44	engine	0015_db_redesign_20190217	2021-12-14 17:51:24.151363+00
45	engine	0016_attribute_spec_20190217	2021-12-14 17:51:24.221309+00
46	engine	0017_db_redesign_20190221	2021-12-14 17:51:25.470468+00
47	engine	0018_jobcommit	2021-12-14 17:51:25.504537+00
48	engine	0019_frame_selection	2021-12-14 17:51:25.594599+00
49	engine	0020_remove_task_flipped	2021-12-14 17:51:25.625914+00
50	engine	0021_auto_20190826_1827	2021-12-14 17:51:25.637294+00
51	engine	0022_auto_20191004_0817	2021-12-14 17:51:25.685646+00
52	engine	0023_auto_20200113_1323	2021-12-14 17:51:25.717237+00
53	engine	0024_auto_20191023_1025	2021-12-14 17:51:26.108507+00
54	engine	0025_auto_20200324_1222	2021-12-14 17:51:26.114437+00
55	engine	0026_auto_20200719_1511	2021-12-14 17:51:26.125945+00
56	engine	0027_auto_20200719_1552	2021-12-14 17:51:26.183222+00
57	engine	0028_labelcolor	2021-12-14 17:51:26.215378+00
58	engine	0029_data_storage_method	2021-12-14 17:51:26.239238+00
59	engine	0030_auto_20200914_1331	2021-12-14 17:51:26.260454+00
60	engine	0031_auto_20201011_0220	2021-12-14 17:51:26.271961+00
61	engine	0032_remove_task_z_order	2021-12-14 17:51:26.283971+00
62	engine	0033_projects_adjastment	2021-12-14 17:51:26.321361+00
63	engine	0034_auto_20201125_1426	2021-12-14 17:51:26.476412+00
64	engine	0035_data_storage	2021-12-14 17:51:26.488459+00
65	engine	0036_auto_20201216_0943	2021-12-14 17:51:26.666652+00
66	engine	0037_task_subset	2021-12-14 17:51:26.698546+00
67	engine	0038_manifest	2021-12-14 17:51:26.722129+00
68	engine	0039_auto_training	2021-12-14 17:51:26.800865+00
69	engine	0040_cloud_storage	2021-12-14 17:51:26.867041+00
70	engine	0041_auto_20210827_0258	2021-12-14 17:51:26.887987+00
71	engine	0042_auto_20210830_1056	2021-12-14 17:51:26.927464+00
72	engine	0043_auto_20211027_0718	2021-12-14 17:51:26.938726+00
73	engine	0044_auto_20211115_0858	2021-12-14 17:51:26.975836+00
74	engine	0044_auto_20211123_0824	2021-12-14 17:51:26.998251+00
75	engine	0045_data_sorting_method	2021-12-14 17:51:27.012846+00
76	engine	0047_auto_20211110_1938	2021-12-14 17:51:27.162676+00
77	engine	0048_auto_20211112_1918	2021-12-14 17:51:27.404377+00
78	sessions	0001_initial	2021-12-14 17:51:27.421795+00
79	sites	0001_initial	2021-12-14 17:51:27.428837+00
80	sites	0002_alter_domain_unique	2021-12-14 17:51:27.439108+00
81	socialaccount	0001_initial	2021-12-14 17:51:27.542302+00
82	socialaccount	0002_token_max_lengths	2021-12-14 17:51:27.568546+00
83	socialaccount	0003_extra_data_default_dict	2021-12-14 17:51:27.579759+00
84	engine	0045_auto_20211123_0824	2021-12-14 17:51:27.582602+00
85	engine	0046_data_sorting_method	2021-12-14 17:51:27.584223+00
86	dataset_repo	0001_initial	2021-12-14 17:51:27.585687+00
87	dataset_repo	0003_gitdata_lfs	2021-12-14 17:51:27.587237+00
88	dataset_repo	0002_auto_20190123_1305	2021-12-14 17:51:27.588845+00
89	engine	0049_auto_20220202_0710	2022-02-11 14:54:41.053611+00
90	engine	0050_auto_20220211_1425	2022-02-11 14:54:41.126041+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
qje4thj4oqumlmj2fe27gae72jg4j6u8	.eJxVjDsOwjAQBe_iGll2Ev8o6TmDtetd4wCypTipEHeHSCmgfTPzXiLCtpa4dV7iTOIstBKn3xEhPbjuhO5Qb02mVtdlRrkr8qBdXhvx83K4fwcFevnWjDT6KfmRlSEHTmGyOfigKA8aR9TZgiXO3jKlwRAr61JGA2YKgZ0S7w8qsjkD:1mxDjE:ktIwpvhQwj3_BtA8Avyq5WmmpmIJD88pF_vSxFzeetA	2021-12-28 19:44:48.529173+00
ic4rcr36vkoymwaw6p322bjqlryvq2jd	.eJxVjMsOwiAQRf-FtSEDFRhcuu83kBkeUjU0Ke3K-O_apAvd3nPOfYlA21rD1vMSpiQuQonT78YUH7ntIN2p3WYZ57YuE8tdkQftcpxTfl4P9--gUq_fWns0mX22NsLZDlE7INLWAzkyODjFyKwzAnExUQNQUamgRnIOkzLi_QHSyzeb:1mxPj7:Bl2FnM4tKrtDftiy20PMjYuIfpHYUK6FG6IYdZjPS6o	2021-12-29 08:33:29.459216+00
mnb97kue40xo05g2rwwkw6d34sxrnesw	.eJxVjDsOwjAQBe_iGllO8E-U9JzB2l3v4gBypDipEHfHkVJAOzPvvVWCbS1pa7ykKauLGtTplyHQk-su8gPqfdY013WZUO-JPmzTtznz63q0fwcFWunrgELAEtGgEzcCGTp7I4ZCdA5iN9KRFaA8YARvDXoL7GNgO5Jn9fkCIRs5Sw:1mxQKq:6A9lz-3mKMJukzqDk-DXfGIbDNeLeGul_TgZ7A6Xlf8	2021-12-29 09:12:28.010763+00
po0rbd1yhywmc0i2jfam69r419a66aj8	.eJxVjMsOwiAQRf-FtSE8pB1cuvcbCMMMUjWQlHZl_HdD0oVu7znnvkWI-1bC3nkNC4mL0OL0u2FMT64D0CPWe5Op1W1dUA5FHrTLWyN-XQ_376DEXkY9QeKzIpWVn9gYhEhkI3lyYFg7jTMDg7WkAdF5mCFh9mRZZUhOi88X-eU4dg:1mzwj8:CWx3-u6eXmWLpwiFMK5_yWnoPY3yUSf1QCZY-UdJcF8	2022-01-05 08:11:58.507079+00
v28l0efbrv9x06z97ilwcf7lwtuf4ctc	.eJxVjDsOwjAQRO_iGlm22fhDSc8ZrLV3gwPIluKkQtydREoBzRTz3sxbRFyXEtfOc5xIXIRW4vRbJsxPrjuhB9Z7k7nVZZ6S3BV50C5vjfh1Pdy_g4K9bGuLXqMDQqdDTtYN6AHIIoGGMIJlQwxB-VFn3gLPzjil3ABkAIBZfL7_vTer:1nABOV:0UAK9VV6D18QF1-189XQ2T9LrQUSdioGNoHdRUzzt7o	2022-02-02 13:52:59.489923+00
wf6d6vzf4u74l08o0qgbqehei21hibea	.eJxVjDEOwjAMRe-SGUUkpHZgZO8ZIttxSAG1UtNOiLtDpQ6w_vfef5lE61LT2nROQzYX48zhd2OSh44byHcab5OVaVzmge2m2J02209Zn9fd_Tuo1Oq3DrGwD040Ro_-nJmJgkgsqAAIioCi0KGKMhU4Mgip6wjRF6JyMu8PBAI5Mw:1nIXJc:oovNJRods5cbviWOWush4H3jDdP8XklEignva_EnQ8Q	2022-02-25 14:54:28.092369+00
\.


--
-- Data for Name: django_site; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.django_site (id, domain, name) FROM stdin;
1	example.com	example.com
\.


--
-- Data for Name: engine_attributespec; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_attributespec (id, label_id, default_value, input_type, mutable, name, "values") FROM stdin;
1	5	mazda	select	f	model	mazda\nvolvo\nbmw
\.


--
-- Data for Name: engine_clientfile; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_clientfile (id, file, data_id) FROM stdin;
1	/home/django/data/data/1/raw/59.png	1
2	/home/django/data/data/1/raw/65.png	1
3	/home/django/data/data/1/raw/90.png	1
4	/home/django/data/data/1/raw/69.png	1
5	/home/django/data/data/1/raw/19.png	1
6	/home/django/data/data/1/raw/91.png	1
7	/home/django/data/data/1/raw/120.png	1
8	/home/django/data/data/1/raw/30.png	1
9	/home/django/data/data/1/raw/127.png	1
10	/home/django/data/data/1/raw/142.png	1
11	/home/django/data/data/1/raw/115.png	1
12	/home/django/data/data/1/raw/73.png	1
13	/home/django/data/data/1/raw/71.png	1
14	/home/django/data/data/1/raw/72.png	1
15	/home/django/data/data/1/raw/20.png	1
16	/home/django/data/data/1/raw/66.png	1
17	/home/django/data/data/1/raw/68.png	1
18	/home/django/data/data/1/raw/80.png	1
19	/home/django/data/data/1/raw/76.png	1
20	/home/django/data/data/1/raw/84.png	1
21	/home/django/data/data/1/raw/101.png	1
22	/home/django/data/data/1/raw/112.png	1
23	/home/django/data/data/1/raw/95.png	1
24	/home/django/data/data/1/raw/124.png	1
25	/home/django/data/data/1/raw/133.png	1
26	/home/django/data/data/1/raw/22.png	1
27	/home/django/data/data/1/raw/97.png	1
28	/home/django/data/data/1/raw/131.png	1
29	/home/django/data/data/1/raw/50.png	1
30	/home/django/data/data/1/raw/48.png	1
31	/home/django/data/data/1/raw/28.png	1
32	/home/django/data/data/1/raw/29.png	1
33	/home/django/data/data/1/raw/93.png	1
34	/home/django/data/data/1/raw/79.png	1
35	/home/django/data/data/1/raw/77.png	1
36	/home/django/data/data/1/raw/107.png	1
37	/home/django/data/data/1/raw/125.png	1
38	/home/django/data/data/1/raw/62.png	1
39	/home/django/data/data/1/raw/78.png	1
40	/home/django/data/data/1/raw/111.png	1
41	/home/django/data/data/1/raw/64.png	1
42	/home/django/data/data/1/raw/55.png	1
43	/home/django/data/data/1/raw/63.png	1
44	/home/django/data/data/1/raw/85.png	1
45	/home/django/data/data/1/raw/121.png	1
46	/home/django/data/data/1/raw/94.png	1
47	/home/django/data/data/1/raw/57.png	1
48	/home/django/data/data/1/raw/141.png	1
49	/home/django/data/data/1/raw/122.png	1
50	/home/django/data/data/1/raw/88.png	1
51	/home/django/data/data/1/raw/38.png	1
52	/home/django/data/data/1/raw/14.png	1
53	/home/django/data/data/1/raw/16.png	1
54	/home/django/data/data/1/raw/109.png	1
55	/home/django/data/data/1/raw/106.png	1
56	/home/django/data/data/1/raw/26.png	1
57	/home/django/data/data/1/raw/98.png	1
58	/home/django/data/data/1/raw/34.png	1
59	/home/django/data/data/1/raw/126.png	1
60	/home/django/data/data/1/raw/105.png	1
61	/home/django/data/data/1/raw/143.png	1
62	/home/django/data/data/1/raw/104.png	1
63	/home/django/data/data/1/raw/89.png	1
64	/home/django/data/data/1/raw/130.png	1
65	/home/django/data/data/1/raw/123.png	1
66	/home/django/data/data/1/raw/43.png	1
67	/home/django/data/data/1/raw/40.png	1
68	/home/django/data/data/1/raw/74.png	1
69	/home/django/data/data/1/raw/117.png	1
70	/home/django/data/data/1/raw/132.png	1
71	/home/django/data/data/1/raw/116.png	1
72	/home/django/data/data/1/raw/52.png	1
73	/home/django/data/data/1/raw/113.png	1
74	/home/django/data/data/1/raw/58.png	1
75	/home/django/data/data/1/raw/99.png	1
76	/home/django/data/data/1/raw/119.png	1
77	/home/django/data/data/1/raw/18.png	1
78	/home/django/data/data/1/raw/137.png	1
79	/home/django/data/data/1/raw/44.png	1
80	/home/django/data/data/1/raw/23.png	1
81	/home/django/data/data/1/raw/39.png	1
82	/home/django/data/data/1/raw/31.png	1
83	/home/django/data/data/1/raw/83.png	1
84	/home/django/data/data/1/raw/67.png	1
85	/home/django/data/data/1/raw/46.png	1
86	/home/django/data/data/1/raw/49.png	1
87	/home/django/data/data/1/raw/108.png	1
88	/home/django/data/data/1/raw/110.png	1
89	/home/django/data/data/1/raw/21.png	1
90	/home/django/data/data/1/raw/129.png	1
91	/home/django/data/data/1/raw/81.png	1
92	/home/django/data/data/1/raw/41.png	1
93	/home/django/data/data/1/raw/96.png	1
94	/home/django/data/data/1/raw/118.png	1
95	/home/django/data/data/1/raw/135.png	1
96	/home/django/data/data/1/raw/87.png	1
97	/home/django/data/data/1/raw/102.png	1
98	/home/django/data/data/1/raw/32.png	1
99	/home/django/data/data/1/raw/47.png	1
100	/home/django/data/data/1/raw/51.png	1
101	/home/django/data/data/1/raw/140.png	1
102	/home/django/data/data/1/raw/15.png	1
103	/home/django/data/data/1/raw/45.png	1
104	/home/django/data/data/1/raw/100.png	1
105	/home/django/data/data/1/raw/33.png	1
106	/home/django/data/data/1/raw/35.png	1
107	/home/django/data/data/1/raw/139.png	1
108	/home/django/data/data/1/raw/61.png	1
109	/home/django/data/data/1/raw/82.png	1
110	/home/django/data/data/1/raw/27.png	1
111	/home/django/data/data/1/raw/136.png	1
112	/home/django/data/data/1/raw/24.png	1
113	/home/django/data/data/1/raw/56.png	1
114	/home/django/data/data/1/raw/36.png	1
115	/home/django/data/data/1/raw/86.png	1
116	/home/django/data/data/1/raw/70.png	1
117	/home/django/data/data/1/raw/53.png	1
118	/home/django/data/data/1/raw/92.png	1
119	/home/django/data/data/1/raw/25.png	1
120	/home/django/data/data/1/raw/54.png	1
121	/home/django/data/data/1/raw/103.png	1
122	/home/django/data/data/1/raw/128.png	1
123	/home/django/data/data/1/raw/42.png	1
124	/home/django/data/data/1/raw/138.png	1
125	/home/django/data/data/1/raw/114.png	1
126	/home/django/data/data/1/raw/60.png	1
127	/home/django/data/data/1/raw/75.png	1
128	/home/django/data/data/1/raw/37.png	1
129	/home/django/data/data/1/raw/17.png	1
130	/home/django/data/data/1/raw/134.png	1
131	/home/django/data/data/2/raw/120.png	2
132	/home/django/data/data/2/raw/127.png	2
133	/home/django/data/data/2/raw/124.png	2
134	/home/django/data/data/2/raw/133.png	2
135	/home/django/data/data/2/raw/131.png	2
136	/home/django/data/data/2/raw/125.png	2
137	/home/django/data/data/2/raw/121.png	2
138	/home/django/data/data/2/raw/122.png	2
139	/home/django/data/data/2/raw/126.png	2
140	/home/django/data/data/2/raw/130.png	2
141	/home/django/data/data/2/raw/123.png	2
142	/home/django/data/data/2/raw/132.png	2
143	/home/django/data/data/2/raw/119.png	2
144	/home/django/data/data/2/raw/137.png	2
145	/home/django/data/data/2/raw/129.png	2
146	/home/django/data/data/2/raw/118.png	2
147	/home/django/data/data/2/raw/135.png	2
148	/home/django/data/data/2/raw/140.png	2
149	/home/django/data/data/2/raw/139.png	2
150	/home/django/data/data/2/raw/136.png	2
151	/home/django/data/data/2/raw/128.png	2
152	/home/django/data/data/2/raw/138.png	2
153	/home/django/data/data/2/raw/134.png	2
154	/home/django/data/data/3/raw/59.png	3
155	/home/django/data/data/3/raw/65.png	3
156	/home/django/data/data/3/raw/90.png	3
157	/home/django/data/data/3/raw/69.png	3
158	/home/django/data/data/3/raw/19.png	3
159	/home/django/data/data/3/raw/91.png	3
160	/home/django/data/data/3/raw/120.png	3
161	/home/django/data/data/3/raw/30.png	3
162	/home/django/data/data/3/raw/127.png	3
163	/home/django/data/data/3/raw/142.png	3
164	/home/django/data/data/3/raw/115.png	3
165	/home/django/data/data/3/raw/73.png	3
166	/home/django/data/data/3/raw/71.png	3
167	/home/django/data/data/3/raw/72.png	3
168	/home/django/data/data/3/raw/3.png	3
169	/home/django/data/data/3/raw/20.png	3
170	/home/django/data/data/3/raw/66.png	3
171	/home/django/data/data/3/raw/145.png	3
172	/home/django/data/data/3/raw/68.png	3
173	/home/django/data/data/3/raw/80.png	3
174	/home/django/data/data/3/raw/76.png	3
175	/home/django/data/data/3/raw/84.png	3
176	/home/django/data/data/3/raw/101.png	3
177	/home/django/data/data/3/raw/112.png	3
178	/home/django/data/data/3/raw/95.png	3
179	/home/django/data/data/3/raw/124.png	3
180	/home/django/data/data/3/raw/133.png	3
181	/home/django/data/data/3/raw/22.png	3
182	/home/django/data/data/3/raw/97.png	3
183	/home/django/data/data/3/raw/131.png	3
184	/home/django/data/data/3/raw/50.png	3
185	/home/django/data/data/3/raw/48.png	3
186	/home/django/data/data/3/raw/28.png	3
187	/home/django/data/data/3/raw/29.png	3
188	/home/django/data/data/3/raw/93.png	3
189	/home/django/data/data/3/raw/79.png	3
190	/home/django/data/data/3/raw/77.png	3
191	/home/django/data/data/3/raw/144.png	3
192	/home/django/data/data/3/raw/107.png	3
193	/home/django/data/data/3/raw/125.png	3
194	/home/django/data/data/3/raw/62.png	3
195	/home/django/data/data/3/raw/78.png	3
196	/home/django/data/data/3/raw/111.png	3
197	/home/django/data/data/3/raw/64.png	3
198	/home/django/data/data/3/raw/55.png	3
199	/home/django/data/data/3/raw/63.png	3
200	/home/django/data/data/3/raw/85.png	3
201	/home/django/data/data/3/raw/121.png	3
202	/home/django/data/data/3/raw/94.png	3
203	/home/django/data/data/3/raw/57.png	3
204	/home/django/data/data/3/raw/141.png	3
205	/home/django/data/data/3/raw/122.png	3
206	/home/django/data/data/3/raw/88.png	3
207	/home/django/data/data/3/raw/147.png	3
208	/home/django/data/data/3/raw/38.png	3
209	/home/django/data/data/3/raw/14.png	3
210	/home/django/data/data/3/raw/16.png	3
211	/home/django/data/data/3/raw/109.png	3
212	/home/django/data/data/3/raw/11.png	3
213	/home/django/data/data/3/raw/106.png	3
214	/home/django/data/data/3/raw/12.png	3
215	/home/django/data/data/3/raw/26.png	3
216	/home/django/data/data/3/raw/98.png	3
217	/home/django/data/data/3/raw/34.png	3
218	/home/django/data/data/3/raw/126.png	3
219	/home/django/data/data/3/raw/105.png	3
220	/home/django/data/data/3/raw/143.png	3
221	/home/django/data/data/3/raw/104.png	3
222	/home/django/data/data/3/raw/89.png	3
223	/home/django/data/data/3/raw/130.png	3
224	/home/django/data/data/3/raw/123.png	3
225	/home/django/data/data/3/raw/43.png	3
226	/home/django/data/data/3/raw/40.png	3
227	/home/django/data/data/3/raw/74.png	3
228	/home/django/data/data/3/raw/117.png	3
229	/home/django/data/data/3/raw/10.png	3
230	/home/django/data/data/3/raw/132.png	3
231	/home/django/data/data/3/raw/116.png	3
232	/home/django/data/data/3/raw/52.png	3
233	/home/django/data/data/3/raw/113.png	3
234	/home/django/data/data/3/raw/58.png	3
235	/home/django/data/data/3/raw/99.png	3
236	/home/django/data/data/3/raw/119.png	3
237	/home/django/data/data/3/raw/18.png	3
238	/home/django/data/data/3/raw/137.png	3
239	/home/django/data/data/3/raw/44.png	3
240	/home/django/data/data/3/raw/23.png	3
241	/home/django/data/data/3/raw/39.png	3
242	/home/django/data/data/3/raw/31.png	3
243	/home/django/data/data/3/raw/83.png	3
244	/home/django/data/data/3/raw/67.png	3
245	/home/django/data/data/3/raw/46.png	3
246	/home/django/data/data/3/raw/49.png	3
247	/home/django/data/data/3/raw/108.png	3
248	/home/django/data/data/3/raw/0.png	3
249	/home/django/data/data/3/raw/110.png	3
250	/home/django/data/data/3/raw/21.png	3
251	/home/django/data/data/3/raw/129.png	3
252	/home/django/data/data/3/raw/81.png	3
253	/home/django/data/data/3/raw/13.png	3
254	/home/django/data/data/3/raw/41.png	3
255	/home/django/data/data/3/raw/96.png	3
256	/home/django/data/data/3/raw/1.png	3
257	/home/django/data/data/3/raw/118.png	3
258	/home/django/data/data/3/raw/135.png	3
259	/home/django/data/data/3/raw/87.png	3
260	/home/django/data/data/3/raw/102.png	3
261	/home/django/data/data/3/raw/32.png	3
262	/home/django/data/data/3/raw/47.png	3
263	/home/django/data/data/3/raw/51.png	3
264	/home/django/data/data/3/raw/140.png	3
265	/home/django/data/data/3/raw/15.png	3
266	/home/django/data/data/3/raw/45.png	3
267	/home/django/data/data/3/raw/100.png	3
268	/home/django/data/data/3/raw/33.png	3
269	/home/django/data/data/3/raw/35.png	3
270	/home/django/data/data/3/raw/139.png	3
271	/home/django/data/data/3/raw/61.png	3
272	/home/django/data/data/3/raw/82.png	3
273	/home/django/data/data/3/raw/27.png	3
274	/home/django/data/data/3/raw/136.png	3
275	/home/django/data/data/3/raw/24.png	3
276	/home/django/data/data/3/raw/9.png	3
277	/home/django/data/data/3/raw/56.png	3
278	/home/django/data/data/3/raw/36.png	3
279	/home/django/data/data/3/raw/86.png	3
280	/home/django/data/data/3/raw/70.png	3
281	/home/django/data/data/3/raw/53.png	3
282	/home/django/data/data/3/raw/92.png	3
283	/home/django/data/data/3/raw/25.png	3
284	/home/django/data/data/3/raw/6.png	3
285	/home/django/data/data/3/raw/54.png	3
286	/home/django/data/data/3/raw/103.png	3
287	/home/django/data/data/3/raw/128.png	3
288	/home/django/data/data/3/raw/146.png	3
289	/home/django/data/data/3/raw/42.png	3
290	/home/django/data/data/3/raw/138.png	3
291	/home/django/data/data/3/raw/114.png	3
292	/home/django/data/data/3/raw/5.png	3
293	/home/django/data/data/3/raw/60.png	3
294	/home/django/data/data/3/raw/75.png	3
295	/home/django/data/data/3/raw/2.png	3
296	/home/django/data/data/3/raw/8.png	3
297	/home/django/data/data/3/raw/37.png	3
298	/home/django/data/data/3/raw/7.png	3
299	/home/django/data/data/3/raw/4.png	3
300	/home/django/data/data/3/raw/17.png	3
301	/home/django/data/data/3/raw/134.png	3
302	/home/django/data/data/4/raw/90.png	4
303	/home/django/data/data/4/raw/91.png	4
304	/home/django/data/data/4/raw/120.png	4
305	/home/django/data/data/4/raw/127.png	4
306	/home/django/data/data/4/raw/142.png	4
307	/home/django/data/data/4/raw/115.png	4
308	/home/django/data/data/4/raw/145.png	4
309	/home/django/data/data/4/raw/101.png	4
310	/home/django/data/data/4/raw/112.png	4
311	/home/django/data/data/4/raw/95.png	4
312	/home/django/data/data/4/raw/124.png	4
313	/home/django/data/data/4/raw/133.png	4
314	/home/django/data/data/4/raw/97.png	4
315	/home/django/data/data/4/raw/131.png	4
316	/home/django/data/data/4/raw/93.png	4
317	/home/django/data/data/4/raw/144.png	4
318	/home/django/data/data/4/raw/107.png	4
319	/home/django/data/data/4/raw/125.png	4
320	/home/django/data/data/4/raw/111.png	4
321	/home/django/data/data/4/raw/121.png	4
322	/home/django/data/data/4/raw/94.png	4
323	/home/django/data/data/4/raw/141.png	4
324	/home/django/data/data/4/raw/122.png	4
325	/home/django/data/data/4/raw/147.png	4
326	/home/django/data/data/4/raw/109.png	4
327	/home/django/data/data/4/raw/106.png	4
328	/home/django/data/data/4/raw/98.png	4
329	/home/django/data/data/4/raw/126.png	4
330	/home/django/data/data/4/raw/105.png	4
331	/home/django/data/data/4/raw/143.png	4
332	/home/django/data/data/4/raw/104.png	4
333	/home/django/data/data/4/raw/130.png	4
334	/home/django/data/data/4/raw/123.png	4
335	/home/django/data/data/4/raw/117.png	4
336	/home/django/data/data/4/raw/132.png	4
337	/home/django/data/data/4/raw/116.png	4
338	/home/django/data/data/4/raw/113.png	4
339	/home/django/data/data/4/raw/99.png	4
340	/home/django/data/data/4/raw/119.png	4
341	/home/django/data/data/4/raw/137.png	4
342	/home/django/data/data/4/raw/108.png	4
343	/home/django/data/data/4/raw/110.png	4
344	/home/django/data/data/4/raw/129.png	4
345	/home/django/data/data/4/raw/96.png	4
346	/home/django/data/data/4/raw/118.png	4
347	/home/django/data/data/4/raw/135.png	4
348	/home/django/data/data/4/raw/102.png	4
349	/home/django/data/data/4/raw/140.png	4
350	/home/django/data/data/4/raw/100.png	4
351	/home/django/data/data/4/raw/139.png	4
352	/home/django/data/data/4/raw/136.png	4
353	/home/django/data/data/4/raw/92.png	4
354	/home/django/data/data/4/raw/103.png	4
355	/home/django/data/data/4/raw/128.png	4
356	/home/django/data/data/4/raw/146.png	4
357	/home/django/data/data/4/raw/138.png	4
358	/home/django/data/data/4/raw/114.png	4
359	/home/django/data/data/4/raw/134.png	4
\.


--
-- Data for Name: engine_cloudstorage; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_cloudstorage (id, provider_type, resource, display_name, created_date, updated_date, credentials, credentials_type, specific_attributes, description, owner_id, organization_id) FROM stdin;
\.


--
-- Data for Name: engine_comment; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_comment (id, message, created_date, updated_date, owner_id, issue_id) FROM stdin;
1	Empyt?	2021-12-22 07:18:30.586175+00	2021-12-22 07:18:30.586221+00	1	1
2	Missing object	2021-12-22 07:18:40.441985+00	2021-12-22 07:18:40.442004+00	1	2
3	It is very very very very long messsage. It is very very very very long messsage. It is very very very very long messsage. It is very very very very long messsage. It is very very very very long messsage. It is very very very very long messsage	2021-12-22 07:19:06.541777+00	2021-12-22 07:19:06.541794+00	1	3
4	test	2021-12-22 07:21:38.792235+00	2021-12-22 07:21:38.792247+00	1	4
5	I don't know why...	2021-12-22 07:22:53.281391+00	2021-12-22 07:22:53.281407+00	1	1
6	Can you see my comment?	2021-12-22 07:23:04.819354+00	2021-12-22 07:23:04.81937+00	1	4
\.


--
-- Data for Name: engine_data; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_data (id, chunk_size, size, image_quality, start_frame, stop_frame, frame_filter, compressed_chunk_type, original_chunk_type, storage_method, storage, cloud_storage_id, sorting_method) FROM stdin;
1	72	130	70	0	129		imageset	imageset	cache	local	\N	natural
2	72	23	70	0	22		imageset	imageset	cache	local	\N	lexicographical
3	72	148	70	0	147		imageset	imageset	cache	local	\N	random
4	72	58	70	0	57		imageset	imageset	cache	local	\N	lexicographical
\.


--
-- Data for Name: engine_image; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_image (id, path, frame, height, width, data_id) FROM stdin;
1	14.png	0	694	598	1
2	15.png	1	917	471	1
3	16.png	2	672	876	1
4	17.png	3	683	681	1
5	18.png	4	619	928	1
6	19.png	5	637	979	1
7	20.png	6	512	675	1
8	21.png	7	294	230	1
9	22.png	8	957	976	1
10	23.png	9	568	906	1
11	24.png	10	453	242	1
12	25.png	11	883	509	1
13	26.png	12	637	692	1
14	27.png	13	532	437	1
15	28.png	14	868	519	1
16	29.png	15	581	841	1
17	30.png	16	740	375	1
18	31.png	17	886	836	1
19	32.png	18	804	532	1
20	33.png	19	928	397	1
21	34.png	20	626	643	1
22	35.png	21	231	479	1
23	36.png	22	120	162	1
24	37.png	23	433	933	1
25	38.png	24	205	736	1
26	39.png	25	389	145	1
27	40.png	26	107	413	1
28	41.png	27	153	279	1
29	42.png	28	1000	763	1
30	43.png	29	948	775	1
31	44.png	30	392	835	1
32	45.png	31	509	295	1
33	46.png	32	979	629	1
34	47.png	33	368	368	1
35	48.png	34	731	620	1
36	49.png	35	953	100	1
37	50.png	36	750	543	1
38	51.png	37	225	519	1
39	52.png	38	986	226	1
40	53.png	39	887	752	1
41	54.png	40	410	722	1
42	55.png	41	335	412	1
43	56.png	42	160	623	1
44	57.png	43	855	982	1
45	58.png	44	412	104	1
46	59.png	45	198	526	1
47	60.png	46	359	865	1
48	61.png	47	906	253	1
49	62.png	48	214	274	1
50	63.png	49	684	957	1
51	64.png	50	243	463	1
52	65.png	51	122	311	1
53	66.png	52	918	675	1
54	67.png	53	219	145	1
55	68.png	54	489	701	1
56	69.png	55	876	990	1
57	70.png	56	275	215	1
58	71.png	57	777	142	1
59	72.png	58	828	499	1
60	73.png	59	397	391	1
61	74.png	60	175	728	1
62	75.png	61	662	518	1
63	76.png	62	658	800	1
64	77.png	63	238	862	1
65	78.png	64	260	330	1
66	79.png	65	537	357	1
67	80.png	66	839	630	1
68	81.png	67	206	429	1
69	82.png	68	227	340	1
70	83.png	69	577	580	1
71	84.png	70	429	845	1
72	85.png	71	672	413	1
73	86.png	72	464	405	1
74	87.png	73	988	923	1
75	88.png	74	720	921	1
76	89.png	75	149	489	1
77	90.png	76	433	934	1
78	91.png	77	523	299	1
79	92.png	78	740	327	1
80	93.png	79	740	425	1
81	94.png	80	722	651	1
82	95.png	81	261	996	1
83	96.png	82	823	815	1
84	97.png	83	647	433	1
85	98.png	84	370	615	1
86	99.png	85	545	343	1
87	100.png	86	177	281	1
88	101.png	87	190	323	1
89	102.png	88	550	958	1
90	103.png	89	498	224	1
91	104.png	90	754	903	1
92	105.png	91	761	896	1
93	106.png	92	390	151	1
94	107.png	93	695	289	1
95	108.png	94	888	373	1
96	109.png	95	519	160	1
97	110.png	96	809	978	1
98	111.png	97	660	926	1
99	112.png	98	738	985	1
100	113.png	99	770	145	1
101	114.png	100	615	450	1
102	115.png	101	795	220	1
103	116.png	102	313	134	1
104	117.png	103	461	828	1
105	118.png	104	805	940	1
106	119.png	105	357	693	1
107	120.png	106	301	254	1
108	121.png	107	334	918	1
109	122.png	108	115	619	1
110	123.png	109	738	599	1
111	124.png	110	355	306	1
112	125.png	111	507	838	1
113	126.png	112	211	885	1
114	127.png	113	522	553	1
115	128.png	114	826	424	1
116	129.png	115	984	264	1
117	130.png	116	387	698	1
118	131.png	117	901	781	1
119	132.png	118	149	144	1
120	133.png	119	131	989	1
121	134.png	120	328	661	1
122	135.png	121	811	333	1
123	136.png	122	497	292	1
124	137.png	123	238	886	1
125	138.png	124	179	759	1
126	139.png	125	746	769	1
127	140.png	126	833	749	1
128	141.png	127	853	623	1
129	142.png	128	361	925	1
130	143.png	129	740	135	1
131	118.png	0	805	940	2
132	119.png	1	357	693	2
133	120.png	2	301	254	2
134	121.png	3	334	918	2
135	122.png	4	115	619	2
136	123.png	5	738	599	2
137	124.png	6	355	306	2
138	125.png	7	507	838	2
139	126.png	8	211	885	2
140	127.png	9	522	553	2
141	128.png	10	826	424	2
142	129.png	11	984	264	2
143	130.png	12	387	698	2
144	131.png	13	901	781	2
145	132.png	14	149	144	2
146	133.png	15	131	989	2
147	134.png	16	328	661	2
148	135.png	17	811	333	2
149	136.png	18	497	292	2
150	137.png	19	238	886	2
151	138.png	20	179	759	2
152	139.png	21	746	769	2
153	140.png	22	833	749	2
154	25.png	0	883	509	3
155	107.png	1	695	289	3
156	46.png	2	979	629	3
157	144.png	3	326	658	3
158	116.png	4	313	134	3
159	39.png	5	389	145	3
160	146.png	6	975	777	3
161	56.png	7	160	623	3
162	2.png	8	557	659	3
163	145.png	9	430	176	3
164	47.png	10	368	368	3
165	20.png	11	512	675	3
166	101.png	12	190	323	3
167	63.png	13	684	957	3
168	119.png	14	357	693	3
169	79.png	15	537	357	3
170	69.png	16	876	990	3
171	62.png	17	214	274	3
172	29.png	18	581	841	3
173	132.png	19	149	144	3
174	90.png	20	433	934	3
175	92.png	21	740	327	3
176	77.png	22	238	862	3
177	87.png	23	988	923	3
178	28.png	24	868	519	3
179	123.png	25	738	599	3
180	98.png	26	370	615	3
181	44.png	27	392	835	3
182	30.png	28	740	375	3
183	48.png	29	731	620	3
184	14.png	30	694	598	3
185	4.png	31	290	282	3
186	89.png	32	149	489	3
187	113.png	33	770	145	3
188	105.png	34	761	896	3
189	57.png	35	855	982	3
190	36.png	36	120	162	3
191	53.png	37	887	752	3
192	75.png	38	662	518	3
193	5.png	39	672	972	3
194	108.png	40	888	373	3
195	94.png	41	722	651	3
196	83.png	42	577	580	3
197	120.png	43	301	254	3
198	66.png	44	918	675	3
199	26.png	45	637	692	3
200	97.png	46	647	433	3
201	147.png	47	542	294	3
202	127.png	48	522	553	3
203	102.png	49	550	958	3
204	27.png	50	532	437	3
205	76.png	51	658	800	3
206	129.png	52	984	264	3
207	143.png	53	740	135	3
208	139.png	54	746	769	3
209	12.png	55	202	817	3
210	93.png	56	740	425	3
211	65.png	57	122	311	3
212	114.png	58	615	450	3
213	19.png	59	637	979	3
214	96.png	60	823	815	3
215	6.png	61	397	899	3
216	84.png	62	429	845	3
217	74.png	63	175	728	3
218	10.png	64	367	315	3
219	99.png	65	545	343	3
220	40.png	66	107	413	3
221	104.png	67	754	903	3
222	61.png	68	906	253	3
223	43.png	69	948	775	3
224	110.png	70	809	978	3
225	140.png	71	833	749	3
226	24.png	72	453	242	3
227	122.png	73	115	619	3
228	35.png	74	231	479	3
229	49.png	75	953	100	3
230	38.png	76	205	736	3
231	33.png	77	928	397	3
232	137.png	78	238	886	3
233	109.png	79	519	160	3
234	70.png	80	275	215	3
235	67.png	81	219	145	3
236	86.png	82	464	405	3
237	82.png	83	227	340	3
238	118.png	84	805	940	3
239	21.png	85	294	230	3
240	134.png	86	328	661	3
241	32.png	87	804	532	3
242	72.png	88	828	499	3
243	17.png	89	683	681	3
244	73.png	90	397	391	3
245	64.png	91	243	463	3
246	0.png	92	100	488	3
247	142.png	93	361	925	3
248	135.png	94	811	333	3
249	131.png	95	901	781	3
250	103.png	96	498	224	3
251	91.png	97	523	299	3
252	121.png	98	334	918	3
253	58.png	99	412	104	3
254	128.png	100	826	424	3
255	31.png	101	886	836	3
256	18.png	102	619	928	3
257	34.png	103	626	643	3
258	112.png	104	738	985	3
259	50.png	105	750	543	3
260	55.png	106	335	412	3
261	88.png	107	720	921	3
262	81.png	108	206	429	3
263	60.png	109	359	865	3
264	9.png	110	840	681	3
265	11.png	111	343	399	3
266	100.png	112	177	281	3
267	15.png	113	917	471	3
268	111.png	114	660	926	3
269	78.png	115	260	330	3
270	125.png	116	507	838	3
271	126.png	117	211	885	3
272	13.png	118	449	331	3
273	42.png	119	1000	763	3
274	138.png	120	179	759	3
275	80.png	121	839	630	3
276	85.png	122	672	413	3
277	1.png	123	492	377	3
278	136.png	124	497	292	3
279	51.png	125	225	519	3
280	8.png	126	672	952	3
281	59.png	127	198	526	3
282	16.png	128	672	876	3
283	45.png	129	509	295	3
284	124.png	130	355	306	3
285	71.png	131	777	142	3
286	117.png	132	461	828	3
287	41.png	133	153	279	3
288	95.png	134	261	996	3
289	115.png	135	795	220	3
290	68.png	136	489	701	3
291	22.png	137	957	976	3
292	133.png	138	131	989	3
293	106.png	139	390	151	3
294	3.png	140	981	388	3
295	52.png	141	986	226	3
296	141.png	142	853	623	3
297	54.png	143	410	722	3
298	130.png	144	387	698	3
299	23.png	145	568	906	3
300	7.png	146	239	541	3
301	37.png	147	433	933	3
302	100.png	0	177	281	4
303	101.png	1	190	323	4
304	102.png	2	550	958	4
305	103.png	3	498	224	4
306	104.png	4	754	903	4
307	105.png	5	761	896	4
308	106.png	6	390	151	4
309	107.png	7	695	289	4
310	108.png	8	888	373	4
311	109.png	9	519	160	4
312	110.png	10	809	978	4
313	111.png	11	660	926	4
314	112.png	12	738	985	4
315	113.png	13	770	145	4
316	114.png	14	615	450	4
317	115.png	15	795	220	4
318	116.png	16	313	134	4
319	117.png	17	461	828	4
320	118.png	18	805	940	4
321	119.png	19	357	693	4
322	120.png	20	301	254	4
323	121.png	21	334	918	4
324	122.png	22	115	619	4
325	123.png	23	738	599	4
326	124.png	24	355	306	4
327	125.png	25	507	838	4
328	126.png	26	211	885	4
329	127.png	27	522	553	4
330	128.png	28	826	424	4
331	129.png	29	984	264	4
332	130.png	30	387	698	4
333	131.png	31	901	781	4
334	132.png	32	149	144	4
335	133.png	33	131	989	4
336	134.png	34	328	661	4
337	135.png	35	811	333	4
338	136.png	36	497	292	4
339	137.png	37	238	886	4
340	138.png	38	179	759	4
341	139.png	39	746	769	4
342	140.png	40	833	749	4
343	141.png	41	853	623	4
344	142.png	42	361	925	4
345	143.png	43	740	135	4
346	144.png	44	326	658	4
347	145.png	45	430	176	4
348	146.png	46	975	777	4
349	147.png	47	542	294	4
350	90.png	48	433	934	4
351	91.png	49	523	299	4
352	92.png	50	740	327	4
353	93.png	51	740	425	4
354	94.png	52	722	651	4
355	95.png	53	261	996	4
356	96.png	54	823	815	4
357	97.png	55	647	433	4
358	98.png	56	370	615	4
359	99.png	57	545	343	4
\.


--
-- Data for Name: engine_issue; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_issue (id, frame, "position", created_date, updated_date, job_id, owner_id, assignee_id, resolved) FROM stdin;
1	50	54.8076171875,75.2099609375,210.205078125,195.767578125	2021-12-22 07:18:30.575175+00	\N	4	1	\N	f
2	51	121.615234375,33.515625,618.193359375,357.7275390625	2021-12-22 07:18:40.432626+00	\N	4	1	\N	f
3	52	32.78125,152.4072265625,211.7841796875,766.12890625	2021-12-22 07:19:06.536571+00	\N	4	1	\N	f
4	50	18.861328125,225.0771484375,283.755859375,371.0732421875	2021-12-22 07:21:38.787374+00	\N	4	1	\N	f
\.


--
-- Data for Name: engine_job; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_job (id, segment_id, assignee_id, status, stage, state) FROM stdin;
3	3	\N	annotation	annotation	new
5	5	\N	validation	acceptance	new
2	2	6	annotation	annotation	new
1	1	\N	annotation	annotation	new
6	6	7	annotation	annotation	new
4	4	\N	validation	validation	new
\.


--
-- Data for Name: engine_jobcommit; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_jobcommit (id, version, "timestamp", message, owner_id, job_id) FROM stdin;
1	1	2021-12-22 07:14:15.237479+00	Changes: tags - 0; shapes - 5; tracks - 0	\N	2
2	2	2021-12-22 07:14:15.268804+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	2
3	3	2021-12-22 07:14:15.298016+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	2
4	1	2021-12-22 07:15:22.945367+00	Changes: tags - 0; shapes - 9; tracks - 0	\N	1
5	2	2021-12-22 07:15:22.985309+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	1
6	3	2021-12-22 07:15:23.019102+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	1
7	1	2021-12-22 07:17:34.839155+00	Changes: tags - 0; shapes - 7; tracks - 0	\N	6
8	2	2021-12-22 07:17:34.878804+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	6
9	3	2021-12-22 07:17:34.909805+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	6
10	1	2021-12-22 07:19:33.859315+00	Changes: tags - 0; shapes - 5; tracks - 0	\N	4
11	2	2021-12-22 07:19:33.907033+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	4
12	3	2021-12-22 07:19:33.934873+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	4
13	4	2021-12-22 07:22:30.331021+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	4
14	5	2021-12-22 07:22:30.362857+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	4
15	6	2021-12-22 07:22:30.388715+00	Changes: tags - 0; shapes - 0; tracks - 0	\N	4
\.


--
-- Data for Name: engine_label; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_label (id, name, task_id, color, project_id) FROM stdin;
1	cat	1	#6080c0	\N
2	dog	1	#406040	\N
3	car	2	#2080c0	\N
4	person	2	#c06060	\N
5	car	\N	#2080c0	1
6	person	\N	#c06060	1
7	cat	\N	#6080c0	2
8	dog	\N	#406040	2
\.


--
-- Data for Name: engine_labeledimage; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledimage (id, frame, "group", job_id, label_id, source) FROM stdin;
\.


--
-- Data for Name: engine_labeledimageattributeval; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledimageattributeval (id, value, spec_id, image_id) FROM stdin;
\.


--
-- Data for Name: engine_labeledshape; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledshape (id, frame, "group", type, occluded, z_order, points, job_id, label_id, source, rotation) FROM stdin;
1	0	0	rectangle	f	0	223.39453125,226.0751953125,513.7663269042969,377.9619903564453	2	3	manual	0
2	1	0	polygon	f	0	63.0791015625,139.75390625,132.19337349397574,112.3867469879533,189.71144578313397,159.23614457831354,191.1030120481937,246.9048192771097,86.73554216867524,335.5012048192784,32.00060240964012,250.15180722891637	2	3	manual	0
3	1	0	polygon	f	0	83.0244140625,216.75390625,112.24759036144678,162.48313253012202,167.44638554216908,183.35662650602535,149.35602409638705,252.0072289156633,84.41626506024113,292.8265060240974,72.81987951807241,258.9650602409638	2	4	manual	0
4	2	0	polyline	f	0	24.443359375,107.2275390625,84.91109877913368,61.125083240844106,169.4316315205324,75.1561598224198,226.5581576026634,113.90865704772477,240.5892341842391,205.77880133185317,210.52264150943483,270.9230854605994	2	3	manual	0
5	22	0	points	f	0	148.94921875,285.6865234375,313.515094339622,400.32830188679145,217.36415094339463,585.2339622641503,64.81698113207494,499.25283018867776	2	3	manual	0
6	0	0	rectangle	f	0	139.595703125,123.2666015625,348.2578582763672,246.5074462890625	1	1	manual	0
7	0	0	rectangle	f	0	249.7421875,432.9091796875,470.0352020263672,558.4607925415039	1	1	manual	0
8	0	0	rectangle	f	0	416.810546875,226.48046875,560.8482818603516,353.5725860595703	1	1	manual	0
9	1	0	rectangle	f	0	0.0,62.05859375,471.0,355.17291259765625	1	1	manual	0
10	1	0	rectangle	f	0	0.0,656.4296875,471.0,827.4130401611328	1	1	manual	0
11	2	0	rectangle	f	0	241.830078125,91.767578125,876.0,671.28369140625	1	1	manual	0
12	3	0	rectangle	f	0	135.8037109375,264.595703125,470.1022644042969,490.49359130859375	1	1	manual	0
13	5	0	rectangle	f	0	0.0,0.0,183.3411865234375,246.05125427246094	1	1	manual	0
14	5	0	rectangle	f	0	780.04296875,0.0,979.0,248.173095703125	1	1	manual	0
15	0	0	polygon	f	0	50.1318359375,80.345703125,128.1219755826878,84.07824639289902,158.76792452830523,130.24361820200102,82.74239733629474,161.47891231964786,22.62918978912603,158.92508324084702,0.0,110.48447384849997,0.0,103.91522863219352	6	7	manual	0
16	0	0	polygon	f	0	204.34375,21.607421875,248.74128745838243,43.609877913431774,258.1708102108787,89.3823529411784,194.9144284128779,108.04495005549688,115.54927857935945,94.6864594894596,93.35061043285532,50.28912319645133,107.69134295227741,33.39456159822657	6	7	manual	0
17	1	0	polygon	f	0	79.9326171875,54.205078125,81.22958500669301,50.313253012047426,84.4725568942431,47.93507362784476,88.79651941097654,45.98929049531398,92.03949129852663,44.90829986613062,96.36345381526007,43.61111111111131,100.03882195448386,42.7463186077639,106.30856760374809,40.80053547523312,113.44310575635791,38.85475234270416,118.63186077643877,37.557563587683035,124.03681392235558,36.26037483266373,128.5769745649268,35.39558232931631,132.03614457831281,34.74698795180666,135.92771084337255,34.098393574297006,142.62985274431048,33.6659973226233,147.17001338687987,33.6659973226233,153.0073627844704,33.88219544846106,160.79049531459168,34.530789825970714,165.33065595716107,34.96318607764442,171.38420348058935,35.611780455154076,175.7081659973228,36.044176706827784,180.46452476572995,36.69277108433744,184.13989290495374,37.557563587683035,189.11244979919684,37.98995983935674,193.65261044176623,38.42235609103045,197.32797858099002,39.070950468540104,200.35475234270416,40.36813922356123,204.6787148594376,42.96251673360166,209.43507362784476,45.55689424364027,213.54283801874226,47.93507362784476,217.434404283802,50.745649263721134,220.67737617135208,54.20481927710898,223.70414993306622,57.01539491298536,227.16331994645225,60.69076305220915,231.70348058902164,65.0147255689426,237.10843373494026,71.06827309236905,242.51338688085707,76.90562248995957,247.26974564926422,82.52677376171414,250.5127175368143,88.36412315930284,252.02610441766956,92.25568942436439,253.10709504685292,96.14725568942413,254.40428380187404,100.68741633199352,255.26907630522146,108.25435073627887,255.26907630522146,112.36211512717455,254.83668005354775,116.90227576974576,253.7556894243644,121.2262382864792,252.89089692101697,124.901606425703,251.3775100401599,129.44176706827238,249.21552878179318,133.54953145916988,246.83734939759051,137.0087014725559,243.37817938420267,140.03547523427005,237.75702811244992,143.9270414993298,230.62248995983828,147.38621151271764,225.43373493975923,149.3319946452466,221.1097724230258,150.196787148594,216.56961178045458,150.62918340026772,212.0294511378852,150.84538152610367,206.40829986613062,151.27777777777737,200.1385542168664,151.71017402945108,193.43641231593028,152.35876840696073,188.89625167335907,152.35876840696073,181.5455153949133,152.35876840696073,177.22155287817986,152.35876840696073,171.6004016064253,152.57496653279668,165.76305220883478,152.57496653279668,161.65528781793728,152.1425702811248,156.46653279785824,151.71017402945108,147.38621151271764,150.41298527442996,136.79250334671997,147.81860776439134,132.46854082998652,146.52141900937022,126.1987951807223,143.9270414993298,121.65863453815291,141.54886211512712,115.60508701472463,138.73828647925075,109.76773761713412,135.7115127175366,106.95716198125774,133.9819277108436,103.93038821954542,130.95515394912945,100.68741633199352,124.25301204819334,97.22824631860749,118.19946452476506,94.20147255689335,112.1459170013386,92.25568942436439,106.95716198125774,90.09370816599767,102.6331994645243,87.28313253011947,98.9578313253005,85.76974564926422,95.06626506024077,82.52677376171414,91.82329317269068,79.06760374832629,88.79651941097654,74.5274431057569,85.98594377510017,69.9872824631857,84.68875502008086,65.0147255689426,84.4725568942431,59.60977242302579,86.41834002677388,56.15060240963794,88.14792503346689,52.90763052208786,89.8775100401599,49.88085676037372,91.82329317269068,47.07028112449734,93.9852744310574,42.31392235609019,97.01204819277154,37.98995983935674,99.17402945113827,34.530789825970714,100.25502008032163,30.855421686746922,98.5254350736268,28.6934404283802,95.06626506024077,25.882864792503824,87.71552878179318,24.5856760374827,82.74297188755008,22.63989290495374,74.95983935742879,21.342704149932615,69.33868808567604,19.829317269075545,63.28514056224958,19.180722891565892,59.17737617135208,18.315930388218476,54.63721552878087,17.883534136546587,50.52945113788519,17.883534136546587,44.692101740294675,17.883534136546587,39.070950468540104,18.964524765729948,33.88219544846106,19.396921017401837,28.909638554216144,19.829317269075545,25.018072289156407,21.775100401606323,20.694109772422962,23.937081659973046,16.58634538152546,26.09906291833977,13.559571619813141,28.26104417670649,10.748995983934947,31.071619812582867,8.803212851405988,35.17938420348037,7.722222222222626,41.23293172690683,7.506024096384863,48.58366800535441,9.235609103077877,53.55622489959751,10.96519410977271,57.447791164659066,12.47858099062978,62.420348058902164,14.424364123158739,66.52811244979966,16.370147255689517,69.33868808567604,18.53212851405624,74.95983935742879,23.7208835341371,77.77041499330699,26.531459170013477,80.7971887550193,30.423025435073214,82.52677376171414,34.74698795180666,83.39156626505974,38.85475234270416,83.6077643908975,42.097724230254244,82.52677376171414,45.55689424364027	6	7	manual	0
18	2	0	polygon	f	0	280.2734375,143.0498046875,298.8688085676058,139.20214190093975,311.693440428382,137.91967871486122,333.4953145917025,136.6372155287845,352.09103078982844,136.6372155287845,371.32797858099366,136.6372155287845,391.8473895582356,136.6372155287845,405.31325301205106,136.6372155287845,427.1151271753697,135.99598393574524,448.2757697456509,135.99598393574524,470.07764390897137,135.99598393574524,484.1847389558261,134.7135207496667,502.78045515395206,134.7135207496667,529.0709504685437,134.07228915662927,545.1017402945145,134.7135207496667,589.9879518072303,138.56091030790049,613.0722891566293,140.48460508701646,626.5381526104447,141.12583668005573,637.4390896921032,141.767068273095,650.2637215528812,143.0495314591717,668.8594377510071,144.9732262382895,681.0428380187441,145.61445783132694,707.974564926375,148.82061579652145,718.8755020080353,150.10307898259998,729.1352074966562,151.3855421686767,738.7536813922379,153.30923694779267,753.5020080321301,157.7978580990657,768.2503346720241,163.56894243641364,783.6398929049556,172.5461847389579,790.693440428382,179.59973226238435,795.8232931726925,187.93574297188934,797.7469879518103,200.76037483266555,797.7469879518103,216.149933065597,786.8460508701501,227.6921017402965,777.8688085676058,232.1807228915677,759.9143239625191,236.66934404284075,747.0896921017429,237.3105756358782,734.9062918340042,237.95180722891746,716.3105756358782,238.59303882195672,697.0736278447148,239.234270414996,675.9129852744336,239.87550200803344,654.7523427041524,240.5167336010727,640.0040160642584,240.5167336010727,619.4846050870165,239.234270414996,606.6599732262403,238.59303882195672,584.2168674698823,238.59303882195672,572.6746987951828,239.234270414996,560.4912985274459,239.234270414996,548.9491298527464,238.59303882195672,536.1244979919702,237.3105756358782,521.376171352078,236.02811244980148,506.627844712184,234.74564926372295,490.5970548862133,233.46318607764624,477.1311914323978,233.46318607764624,457.25301204819516,232.82195448460698,441.22222222222445,232.1807228915677,419.420348058904,232.1807228915677,391.8473895582356,232.1807228915677,377.0990629183416,232.1807228915677,362.3507362784494,232.1807228915677,346.96117804551795,232.82195448460698,331.5716198125865,234.1044176706855,316.8232931726925,236.02811244980148,295.6626506024113,242.44042838018868,286.0441767068296,246.92904953146171,272.57831325301413,255.2650602409667,264.8835341365484,262.31860776439316,257.82998661312195,276.4257028112479,256.5475234270434,288.60910307898484,256.5475234270434,303.9986613119163,259.7536813922379,318.10575635877103,266.1659973226251,326.441767068276,273.86077643909266,334.7777777777792,290.5327978581008,346.3199464524787,302.0749665328003,351.4497991967892,320.029451137887,355.9384203480604,340.54886211512894,359.1445783132549,359.78580990629416,360.4270414993334,370.6867469879544,361.70950468541014,388.6412315930411,361.70950468541014,418.77911646586654,364.91566265060465,436.09236947791396,366.8393574297206,461.1004016064271,369.40428380187586,480.9785809906316,371.32797858099366,497.0093708166023,373.25167336010963,512.3989290495338,376.45783132530414,529.0709504685437,379.0227576974594,545.7429718875519,382.22891566265207,566.2623828647938,384.7938420348073,582.2931726907645,387.35876840696255,596.4002677376193,388.6412315930411,607.9424364123188,390.56492637215706,619.4846050870165,392.48862115127304,636.7978580990657,398.90093708166205,647.0575635876867,401.4658634538173,656.0348058902291,411.084337349399,659.2409638554236,421.3440428380218,660.5234270415021,434.80990629183543,659.8821954484629,450.84069611780615,654.1111111111131,460.45917001338967,638.7215528781817,470.07764390897137,618.843373493979,474.5662650602426,609.2248995983955,475.8487282463211,592.5528781793855,475.8487282463211,570.1097724230276,475.8487282463211,551.5140562249017,475.8487282463211,538.6894243641254,475.8487282463211,511.7576974564945,475.8487282463211,493.8032128514078,474.5662650602426,478.41365461847636,474.5662650602426,464.9477911646609,474.5662650602426,451.4819277108454,474.5662650602426,434.80990629183543,474.5662650602426,420.06157965194325,474.5662650602426,400.1834002677406,473.92503346720514,384.15261044176987,473.2838018741659,373.8929049531489,473.2838018741659,357.8621151271782,472.00133868808734,335.41900937081846,470.07764390897137,325.80053547523676,468.1539491298554,305.92235609103227,464.9477911646609,291.1740294511401,463.0240963855449,277.7081659973246,460.45917001338967,267.44846050870365,457.8942436412344,250.13520749665622,453.4056224899614,236.66934404284075,448.91700133869017,225.76840696118052,444.42838018741895,214.22623828648102,439.29852744310847,199.47791164658884,430.9625167336035,187.29451137885007,425.832663989293,173.18741633199716,416.85542168674874,162.9277108433762,408.51941097724375,153.95046854083193,399.5421686747013,146.89692101740548,391.2061579651963,140.48460508701646,382.22891566265207,135.35475234270598,370.0455153949151,129.58366800535623,354.6559571619837,125.09504685408501,339.26639892905223,120.6064257028138,319.38821954484774,118.68273092369782,309.76974564926604,114.19410977242478,296.94511378848983,110.34672021419283,284.7617135207511,104.57563587684308,271.2958500669374,92.39223560910432,244.36412315930647,84.6974564926386,228.97456492637502,77.64390896921213,212.9437751004043,71.23159303882494,193.7068273092391,65.46050870147519,177.67603748326837,62.254350736280685,162.28647925033692,60.33065595716471,149.46184738956072,59.04819277108618,132.14859437751147,58.40696117804691,118.04149933065855,58.40696117804691,103.29317269076455,59.04819277108618,92.39223560910432,60.971887550202155,78.2851405622514,63.536813922357396,65.46050870147519,66.10174029451264,52.635876840698984,69.30789825970714,43.017402945115464,76.36144578313542,32.7576974564945,87.9036144578331,21.856760374834266,97.52208835341662,16.085676037484518,109.0642570281143,12.238286479252565,125.09504685408501,9.673360107097324,137.91967871486122,9.673360107097324,150.10307898259998,12.238286479252565,161.0040160642584,18.65060240964158,170.62248995984191,31.475234270417786,176.39357429719166,41.73493975903875,180.24096385542362,57.1244979919702,182.1646586345396,71.87282463186239,182.80589022757886,89.18607764391163,180.88219544846288,103.29317269076455,178.9585006693469,115.47657295850331,177.0348058902291,127.65997322624025,175.11111111111313,138.56091030790049,173.18741633199716,150.74431057563743,173.18741633199716,166.77510040160814,176.39357429719166,181.52342704150215,182.1646586345396,192.42436412316056,191.14190093708385,203.3253012048208,200.76037483266555,207.81392235609383,211.0200803212865,202.68406961178334,224.485943775102,187.29451137885007,230.898259705491,175.11111111111313,235.38688085676222,154.5917001338712,236.66934404284075,137.27844712182196,236.66934404284075,118.68273092369782,234.74564926372295,107.78179384203759,232.82195448460698,92.39223560910432,230.25702811245174,79.56760374832811,229.61579651941247,68.6666666666697,228.97456492637502,57.76572958500947,230.25702811245174,47.5060240963885,235.38688085676222,36.60508701472827,248.8527443105777,34.681392235610474,259.7536813922379,40.45247657296022,269.3721552878196,45.582329317270705,277.7081659973246,51.99464524765972,283.47925033467436,60.33065595716471,283.47925033467436,72.51405622490165,282.19678714859583,82.77376171352262,278.3493975903639,93.67469879518285,276.4257028112479,103.29317269076455,275.1432396251694,113.55287817938552,276.4257028112479,123.17135207496904	6	7	manual	0
19	3	0	polygon	f	0	72.185546875,29.8466796875,26.30943396226212,62.45726970033138,26.30943396226212,71.30077691453698,26.30943396226212,82.35516093229671,27.414872364039184,93.40954495005462,29.625749167589674,102.80577136514876,32.3893451720287,111.64927857935436,40.12741398446087,118.834628190898,50.62907880133025,122.70366259711227,69.42153163151852,123.2563817980008,86.55582685904483,123.2563817980008,98.16293007768945,123.2563817980008,111.42819089899967,123.80910099888933,123.03529411764612,122.70366259711227,135.7478357380678,121.04550499444849,145.69678135404865,117.17647058823422,154.54028856825607,111.64927857935436,162.27835738068643,103.911209766924,166.14739178690252,95.62042175360511,168.91098779134154,87.32963374028623,172.2273029966691,79.03884572696916,174.99089900110812,70.19533851276174,176.09633740288336,61.351831298556135,175.54361820199665,52.508324084348715,177.20177580466043,43.66481687014311,183.281687014427,34.82130965593569,201.52142064372674,20.450610432850226,195.44150943396016,14.370699223083648,187.7034406215298,9.948945615980847,176.09633740288336,6.079911209764759,167.8055493895663,3.3163152053257363,157.85660377358363,1.6581576026619587,146.80221975582572,1.1054384017734264,134.64239733629074,0.5527192008867132,122.48257491675759,1.1054384017734264,112.53362930077492,2.763596004437204,103.69012208656932,4.974472807989514,94.29389567147518,7.738068812428537,86.55582685904483,12.159822419533157,77.71231964483741,17.13429522752267	6	7	manual	0
20	3	0	polygon	f	0	40.9013671875,278.5703125,49.74472807990969,274.7014428412858,60.7991120976676,272.4905660377335,69.08990011098649,271.9378468368468,80.69700332963293,271.38512763595827,92.30410654827756,271.38512763595827,110.54384017757911,272.4905660377335,122.70366259711227,274.1487236403973,140.3906770255253,279.67591564927716,152.55049944506027,284.6503884572685,163.05216426192965,297.9156492785769,170.23751387347147,306.2064372918958,179.63374028856742,316.15538290787845,185.713651498334,327.20976692563636,188.47724750277303,336.6059933407305,189.58268590454827,348.21309655937694,187.9245283018845,358.1620421753596,184.05549389567022,367.0055493895652,176.31742508323987,379.7180910099869,166.3684794672572,388.5615982241943,156.41953385127454,395.1942286348494,144.25971143174138,401.274139844616,130.99445061043116,406.24861265260733,116.62375138734569,410.1176470588216,103.911209766924,409.5649278579349,94.51498335182987,402.37957824639125,86.22419533851098,393.53607103218565,77.38068812430538,383.03440621531445,71.30077691453698,369.2164261931175,64.66814650388369,355.39844617091876,59.69367369589236,344.8967813540494,56.930077691451515,336.6059933407305,55.82463928967627,328.3152053274116,56.3773584905648,317.2608213096537,58.58823529411529,308.9700332963366,56.930077691451515,299.57380688124067,51.40288568257347,292.9411764705874,44.77025527191836,287.4139844617075,37.584905660376535,282.4395116537162	6	7	manual	0
21	3	0	polygon	f	0	106.1220703125,302.8896484375,96.72586015538218,305.10099889012054,88.43507214206329,303.9955604883453,80.1442841287444,307.86459489455956,72.40621531631405,315.0499445061032,68.53718091009796,323.8934517203088,67.98446170921125,334.9478357380667,77.38068812430538,344.34406215316085,85.67147613762245,346.0022197558246,95.0677025527184,347.6603773584884,107.78024417314009,351.5294117647045,116.62375138734569,353.7402885682568,124.91453940066458,352.082130965593,132.0998890122064,345.4495005549379,139.83795782463858,337.71143174250756,145.36514983351663,327.7624861265249,148.12874583795565,318.36625971143076,141.49611542730054,312.28634850166236,133.20532741398347,308.9700332963366,124.91453940066458,305.65371809100907,117.72918978912094,301.23196448390445	6	7	manual	0
22	50	0	rectangle	f	0	103.4892578125,60.298828125,319.7179412841797,185.8331298828125	4	5	manual	0
23	51	0	rectangle	f	0	159.9375,290.716796875,415.7503967285156,440.51097106933594	4	5	manual	0
24	52	0	rectangle	f	0	85.9462890625,138.1123046875,166.75294494628906,391.78382873535156	4	5	manual	0
25	52	0	rectangle	f	0	45.03125,638.294921875,224.0333251953125,770.2450256347656	4	5	manual	0
26	53	0	rectangle	f	0	34.384765625,283.845703125,108.30784606933594,382.30724334716797	4	5	manual	0
\.


--
-- Data for Name: engine_labeledshapeattributeval; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledshapeattributeval (id, value, spec_id, shape_id) FROM stdin;
1	mazda	1	22
2	mazda	1	23
3	mazda	1	24
4	mazda	1	25
5	mazda	1	26
\.


--
-- Data for Name: engine_labeledtrack; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledtrack (id, frame, "group", job_id, label_id, source) FROM stdin;
\.


--
-- Data for Name: engine_labeledtrackattributeval; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_labeledtrackattributeval (id, value, spec_id, track_id) FROM stdin;
\.


--
-- Data for Name: engine_manifest; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_manifest (id, filename, cloud_storage_id) FROM stdin;
\.


--
-- Data for Name: engine_profile; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_profile (id, rating, user_id) FROM stdin;
1	0	1
2	0	2
3	0	3
4	0	4
5	0	5
6	0	6
7	0	7
8	0	8
9	0	9
10	0	10
11	0	11
12	0	12
13	0	13
14	0	14
15	0	15
16	0	16
17	0	17
18	0	18
\.


--
-- Data for Name: engine_project; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_project (id, name, bug_tracker, created_date, updated_date, status, assignee_id, owner_id, organization_id) FROM stdin;
1	project1		2021-12-14 19:46:37.969497+00	2021-12-14 19:48:33.103265+00	annotation	\N	10	\N
2	project2		2021-12-14 19:52:37.278149+00	2021-12-14 19:55:57.483506+00	annotation	3	10	2
\.


--
-- Data for Name: engine_relatedfile; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_relatedfile (id, path, data_id, primary_image_id) FROM stdin;
\.


--
-- Data for Name: engine_remotefile; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_remotefile (id, file, data_id) FROM stdin;
\.


--
-- Data for Name: engine_segment; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_segment (id, start_frame, stop_frame, task_id) FROM stdin;
1	0	129	1
2	0	22	2
3	0	49	3
4	50	99	3
5	100	147	3
6	0	57	4
\.


--
-- Data for Name: engine_serverfile; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_serverfile (id, file, data_id) FROM stdin;
\.


--
-- Data for Name: engine_task; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_task (id, name, mode, created_date, updated_date, status, bug_tracker, owner_id, overlap, assignee_id, segment_size, project_id, data_id, dimension, subset, organization_id) FROM stdin;
2	task2	annotation	2021-12-14 18:50:29.458488+00	2021-12-22 07:14:15.234748+00	annotation		2	0	\N	23	\N	2	2d		1
1	task1	annotation	2021-12-14 18:43:47.601289+00	2021-12-22 07:15:22.942484+00	annotation		2	0	\N	130	\N	1	2d		\N
4	task1_in_project2	annotation	2021-12-14 19:55:57.475273+00	2021-12-22 07:17:34.836384+00	annotation		10	0	\N	58	2	4	2d	train	2
3	task1_in_project1	annotation	2021-12-14 19:48:33.089778+00	2021-12-22 07:19:33.85476+00	annotation		10	0	\N	50	1	3	2d	Train	\N
\.


--
-- Data for Name: engine_trackedshape; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_trackedshape (type, occluded, z_order, points, id, frame, outside, track_id, rotation) FROM stdin;
\.


--
-- Data for Name: engine_trackedshapeattributeval; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_trackedshapeattributeval (id, value, shape_id, spec_id) FROM stdin;
\.


--
-- Data for Name: engine_video; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.engine_video (id, path, height, width, data_id) FROM stdin;
\.


--
-- Data for Name: organizations_invitation; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.organizations_invitation (key, created_date, membership_id, owner_id) FROM stdin;
Lzyzgo161I7Fej1vC5RXPdyUgCBfbuxsEEhHYeYOJqvbeJe5clPDnqCm7pKOC9tr	2021-12-14 18:47:39.935203+00	2	2
aViZkw9TaieLoZaswEnkMy8tTet1yYDRof3eKZDtZaHf1BItgCNNM6y6fnjrkrej	2021-12-14 18:47:49.322807+00	3	2
cbmm587Z05WQUYvesIZUCtbTl7CEL4thv1Au6Nr51psflITn9X6BsvNFXcNEkoYn	2021-12-14 18:48:46.579536+00	4	2
Y1I4FFU27WRqq2rWQLtKjDztMqpvqW7gJgg7q73F7oE4H5kukvXugWjiTLHclPDu	2021-12-14 19:54:33.591399+00	6	10
62HplmGPJuzpTXSyzPWiAlREkq8smCjK30GdtYze3q03J9X5ghQe3oMhlAyQ0WBH	2021-12-14 19:54:46.172754+00	7	10
mFpVV2Yh39uUdU8IpigSxvuPegqi8sjxFi6P9Jdy6fBE8Ky9Juzi1KjeGDQsizSS	2021-12-14 19:54:56.431899+00	8	10
h43G28di7vfs4Jv5VrKZ26xvGAfm6Yc2FFv14z9EKhiuIEDQ22pEnzmSCab8MnK1	2021-12-14 19:55:13.745912+00	9	10
5FjIXya6fTGvlRpauFvi2QN1wDOqo1V9REB5rJinDR8FZO9gr0qmtWpghsCte8Y1	2022-01-19 13:54:42.005381+00	10	10
BrwoDmMNQQ1v9WXOukp9DwQVuqB3RDPjpUECCEq6QcAuG0Pi8k1IYtQ9uz9jg0Bv	2022-01-19 13:54:42.015131+00	11	10
\.


--
-- Data for Name: organizations_membership; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.organizations_membership (id, is_active, joined_date, role, organization_id, user_id) FROM stdin;
1	t	2021-12-14 18:45:40.172529+00	owner	1	2
2	t	2021-12-14 18:47:39.935203+00	worker	1	6
3	t	2021-12-14 18:47:49.322807+00	worker	1	7
4	t	2021-12-14 18:48:46.579536+00	maintainer	1	10
5	t	2021-12-14 19:51:38.667522+00	owner	2	10
6	t	2021-12-14 19:54:33.591399+00	maintainer	2	11
7	t	2021-12-14 19:54:46.172754+00	worker	2	7
8	t	2021-12-14 19:54:56.431899+00	worker	2	8
9	t	2021-12-14 19:55:13.745912+00	supervisor	2	3
10	t	2022-01-19 13:54:42.005381+00	supervisor	2	4
11	t	2022-01-19 13:54:42.015131+00	maintainer	2	5
\.


--
-- Data for Name: organizations_organization; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.organizations_organization (id, slug, name, description, created_date, updated_date, contact, owner_id) FROM stdin;
1	org1	organization #1		2021-12-14 18:45:40.172529+00	2021-12-14 18:45:40.172542+00	{"email": "org1@cvat.org"}	2
2	org2	Organization #2		2021-12-14 19:51:38.667522+00	2021-12-14 19:51:38.667536+00	{"email": "org2@cvat.org"}	10
\.


--
-- Data for Name: socialaccount_socialaccount; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.socialaccount_socialaccount (id, provider, uid, last_login, date_joined, extra_data, user_id) FROM stdin;
\.


--
-- Data for Name: socialaccount_socialapp; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.socialaccount_socialapp (id, provider, name, client_id, secret, key) FROM stdin;
\.


--
-- Data for Name: socialaccount_socialapp_sites; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.socialaccount_socialapp_sites (id, socialapp_id, site_id) FROM stdin;
\.


--
-- Data for Name: socialaccount_socialtoken; Type: TABLE DATA; Schema: public; Owner: root
--

COPY public.socialaccount_socialtoken (id, token, token_secret, expires_at, account_id, app_id) FROM stdin;
\.


--
-- Name: account_emailaddress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.account_emailaddress_id_seq', 1, false);


--
-- Name: account_emailconfirmation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.account_emailconfirmation_id_seq', 1, false);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 4, true);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 88, true);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_user_groups_id_seq', 44, true);


--
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_user_id_seq', 18, true);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.auth_user_user_permissions_id_seq', 1, false);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 41, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 48, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 90, true);


--
-- Name: django_site_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.django_site_id_seq', 1, true);


--
-- Name: engine_attributespec_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_attributespec_id_seq', 1, true);


--
-- Name: engine_clientfile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_clientfile_id_seq', 359, true);


--
-- Name: engine_cloudstorage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_cloudstorage_id_seq', 1, false);


--
-- Name: engine_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_comment_id_seq', 6, true);


--
-- Name: engine_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_data_id_seq', 4, true);


--
-- Name: engine_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_image_id_seq', 359, true);


--
-- Name: engine_issue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_issue_id_seq', 4, true);


--
-- Name: engine_job_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_job_id_seq', 6, true);


--
-- Name: engine_jobcommit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_jobcommit_id_seq', 15, true);


--
-- Name: engine_label_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_label_id_seq', 8, true);


--
-- Name: engine_labeledimage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledimage_id_seq', 1, false);


--
-- Name: engine_labeledimageattributeval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledimageattributeval_id_seq', 1, false);


--
-- Name: engine_labeledshape_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledshape_id_seq', 26, true);


--
-- Name: engine_labeledshapeattributeval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledshapeattributeval_id_seq', 5, true);


--
-- Name: engine_labeledtrack_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledtrack_id_seq', 1, false);


--
-- Name: engine_labeledtrackattributeval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_labeledtrackattributeval_id_seq', 1, false);


--
-- Name: engine_manifest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_manifest_id_seq', 1, false);


--
-- Name: engine_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_profile_id_seq', 18, true);


--
-- Name: engine_project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_project_id_seq', 2, true);


--
-- Name: engine_relatedfile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_relatedfile_id_seq', 1, false);


--
-- Name: engine_remotefile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_remotefile_id_seq', 1, false);


--
-- Name: engine_segment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_segment_id_seq', 6, true);


--
-- Name: engine_serverfile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_serverfile_id_seq', 1, false);


--
-- Name: engine_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_task_id_seq', 4, true);


--
-- Name: engine_trackedshape_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_trackedshape_id_seq', 1, false);


--
-- Name: engine_trackedshapeattributeval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_trackedshapeattributeval_id_seq', 1, false);


--
-- Name: engine_video_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.engine_video_id_seq', 1, false);


--
-- Name: organizations_membership_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.organizations_membership_id_seq', 11, true);


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.organizations_organization_id_seq', 2, true);


--
-- Name: socialaccount_socialaccount_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.socialaccount_socialaccount_id_seq', 1, false);


--
-- Name: socialaccount_socialapp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.socialaccount_socialapp_id_seq', 1, false);


--
-- Name: socialaccount_socialapp_sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.socialaccount_socialapp_sites_id_seq', 1, false);


--
-- Name: socialaccount_socialtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: root
--

SELECT pg_catalog.setval('public.socialaccount_socialtoken_id_seq', 1, false);


--
-- Name: account_emailaddress account_emailaddress_email_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailaddress
    ADD CONSTRAINT account_emailaddress_email_key UNIQUE (email);


--
-- Name: account_emailaddress account_emailaddress_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailaddress
    ADD CONSTRAINT account_emailaddress_pkey PRIMARY KEY (id);


--
-- Name: account_emailconfirmation account_emailconfirmation_key_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailconfirmation
    ADD CONSTRAINT account_emailconfirmation_key_key UNIQUE (key);


--
-- Name: account_emailconfirmation account_emailconfirmation_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailconfirmation
    ADD CONSTRAINT account_emailconfirmation_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq UNIQUE (user_id, group_id);


--
-- Name: auth_user auth_user_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id);


--
-- Name: auth_user auth_user_username_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_username_key UNIQUE (username);


--
-- Name: authtoken_token authtoken_token_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.authtoken_token
    ADD CONSTRAINT authtoken_token_pkey PRIMARY KEY (key);


--
-- Name: authtoken_token authtoken_token_user_id_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.authtoken_token
    ADD CONSTRAINT authtoken_token_user_id_key UNIQUE (user_id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: django_site django_site_domain_a2e37b91_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_site
    ADD CONSTRAINT django_site_domain_a2e37b91_uniq UNIQUE (domain);


--
-- Name: django_site django_site_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_site
    ADD CONSTRAINT django_site_pkey PRIMARY KEY (id);


--
-- Name: engine_attributespec engine_attributespec_label_id_name_d85e616c_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_attributespec
    ADD CONSTRAINT engine_attributespec_label_id_name_d85e616c_uniq UNIQUE (label_id, name);


--
-- Name: engine_attributespec engine_attributespec_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_attributespec
    ADD CONSTRAINT engine_attributespec_pkey PRIMARY KEY (id);


--
-- Name: engine_clientfile engine_clientfile_data_id_file_c9989a74_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_clientfile
    ADD CONSTRAINT engine_clientfile_data_id_file_c9989a74_uniq UNIQUE (data_id, file);


--
-- Name: engine_clientfile engine_clientfile_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_clientfile
    ADD CONSTRAINT engine_clientfile_pkey PRIMARY KEY (id);


--
-- Name: engine_cloudstorage engine_cloudstorage_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_cloudstorage
    ADD CONSTRAINT engine_cloudstorage_pkey PRIMARY KEY (id);


--
-- Name: engine_cloudstorage engine_cloudstorage_provider_type_resource_c_d420f2e9_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_cloudstorage
    ADD CONSTRAINT engine_cloudstorage_provider_type_resource_c_d420f2e9_uniq UNIQUE (provider_type, resource, credentials);


--
-- Name: engine_comment engine_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_comment
    ADD CONSTRAINT engine_comment_pkey PRIMARY KEY (id);


--
-- Name: engine_data engine_data_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_data
    ADD CONSTRAINT engine_data_pkey PRIMARY KEY (id);


--
-- Name: engine_image engine_image_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_image
    ADD CONSTRAINT engine_image_pkey PRIMARY KEY (id);


--
-- Name: engine_issue engine_issue_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_issue
    ADD CONSTRAINT engine_issue_pkey PRIMARY KEY (id);


--
-- Name: engine_job engine_job_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_job
    ADD CONSTRAINT engine_job_pkey PRIMARY KEY (id);


--
-- Name: engine_jobcommit engine_jobcommit_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_jobcommit
    ADD CONSTRAINT engine_jobcommit_pkey PRIMARY KEY (id);


--
-- Name: engine_label engine_label_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_label
    ADD CONSTRAINT engine_label_pkey PRIMARY KEY (id);


--
-- Name: engine_label engine_label_task_id_name_00e8779a_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_label
    ADD CONSTRAINT engine_label_task_id_name_00e8779a_uniq UNIQUE (task_id, name);


--
-- Name: engine_labeledimage engine_labeledimage_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimage
    ADD CONSTRAINT engine_labeledimage_pkey PRIMARY KEY (id);


--
-- Name: engine_labeledimageattributeval engine_labeledimageattributeval_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimageattributeval
    ADD CONSTRAINT engine_labeledimageattributeval_pkey PRIMARY KEY (id);


--
-- Name: engine_labeledshape engine_labeledshape_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshape
    ADD CONSTRAINT engine_labeledshape_pkey PRIMARY KEY (id);


--
-- Name: engine_labeledshapeattributeval engine_labeledshapeattributeval_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshapeattributeval
    ADD CONSTRAINT engine_labeledshapeattributeval_pkey PRIMARY KEY (id);


--
-- Name: engine_labeledtrack engine_labeledtrack_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrack
    ADD CONSTRAINT engine_labeledtrack_pkey PRIMARY KEY (id);


--
-- Name: engine_labeledtrackattributeval engine_labeledtrackattributeval_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrackattributeval
    ADD CONSTRAINT engine_labeledtrackattributeval_pkey PRIMARY KEY (id);


--
-- Name: engine_manifest engine_manifest_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_manifest
    ADD CONSTRAINT engine_manifest_pkey PRIMARY KEY (id);


--
-- Name: engine_profile engine_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_profile
    ADD CONSTRAINT engine_profile_pkey PRIMARY KEY (id);


--
-- Name: engine_profile engine_profile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_profile
    ADD CONSTRAINT engine_profile_user_id_key UNIQUE (user_id);


--
-- Name: engine_project engine_project_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_project
    ADD CONSTRAINT engine_project_pkey PRIMARY KEY (id);


--
-- Name: engine_relatedfile engine_relatedfile_data_id_path_a7223d1e_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_relatedfile
    ADD CONSTRAINT engine_relatedfile_data_id_path_a7223d1e_uniq UNIQUE (data_id, path);


--
-- Name: engine_relatedfile engine_relatedfile_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_relatedfile
    ADD CONSTRAINT engine_relatedfile_pkey PRIMARY KEY (id);


--
-- Name: engine_remotefile engine_remotefile_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_remotefile
    ADD CONSTRAINT engine_remotefile_pkey PRIMARY KEY (id);


--
-- Name: engine_segment engine_segment_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_segment
    ADD CONSTRAINT engine_segment_pkey PRIMARY KEY (id);


--
-- Name: engine_serverfile engine_serverfile_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_serverfile
    ADD CONSTRAINT engine_serverfile_pkey PRIMARY KEY (id);


--
-- Name: engine_task engine_task_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_pkey PRIMARY KEY (id);


--
-- Name: engine_trackedshape engine_trackedshape_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshape
    ADD CONSTRAINT engine_trackedshape_pkey PRIMARY KEY (id);


--
-- Name: engine_trackedshapeattributeval engine_trackedshapeattributeval_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshapeattributeval
    ADD CONSTRAINT engine_trackedshapeattributeval_pkey PRIMARY KEY (id);


--
-- Name: engine_video engine_video_data_id_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_video
    ADD CONSTRAINT engine_video_data_id_key UNIQUE (data_id);


--
-- Name: engine_video engine_video_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_video
    ADD CONSTRAINT engine_video_pkey PRIMARY KEY (id);


--
-- Name: dataset_repo_gitdata git_gitdata_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.dataset_repo_gitdata
    ADD CONSTRAINT git_gitdata_pkey PRIMARY KEY (task_id);


--
-- Name: organizations_invitation organizations_invitation_membership_id_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_invitation
    ADD CONSTRAINT organizations_invitation_membership_id_key UNIQUE (membership_id);


--
-- Name: organizations_invitation organizations_invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_invitation
    ADD CONSTRAINT organizations_invitation_pkey PRIMARY KEY (key);


--
-- Name: organizations_membership organizations_membership_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_membership
    ADD CONSTRAINT organizations_membership_pkey PRIMARY KEY (id);


--
-- Name: organizations_membership organizations_membership_user_id_organization_id_b9b50ec7_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_membership
    ADD CONSTRAINT organizations_membership_user_id_organization_id_b9b50ec7_uniq UNIQUE (user_id, organization_id);


--
-- Name: organizations_organization organizations_organization_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_organization
    ADD CONSTRAINT organizations_organization_pkey PRIMARY KEY (id);


--
-- Name: organizations_organization organizations_organization_slug_key; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_organization
    ADD CONSTRAINT organizations_organization_slug_key UNIQUE (slug);


--
-- Name: socialaccount_socialaccount socialaccount_socialaccount_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialaccount
    ADD CONSTRAINT socialaccount_socialaccount_pkey PRIMARY KEY (id);


--
-- Name: socialaccount_socialaccount socialaccount_socialaccount_provider_uid_fc810c6e_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialaccount
    ADD CONSTRAINT socialaccount_socialaccount_provider_uid_fc810c6e_uniq UNIQUE (provider, uid);


--
-- Name: socialaccount_socialapp_sites socialaccount_socialapp__socialapp_id_site_id_71a9a768_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp_sites
    ADD CONSTRAINT socialaccount_socialapp__socialapp_id_site_id_71a9a768_uniq UNIQUE (socialapp_id, site_id);


--
-- Name: socialaccount_socialapp socialaccount_socialapp_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp
    ADD CONSTRAINT socialaccount_socialapp_pkey PRIMARY KEY (id);


--
-- Name: socialaccount_socialapp_sites socialaccount_socialapp_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp_sites
    ADD CONSTRAINT socialaccount_socialapp_sites_pkey PRIMARY KEY (id);


--
-- Name: socialaccount_socialtoken socialaccount_socialtoken_app_id_account_id_fca4e0ac_uniq; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialtoken
    ADD CONSTRAINT socialaccount_socialtoken_app_id_account_id_fca4e0ac_uniq UNIQUE (app_id, account_id);


--
-- Name: socialaccount_socialtoken socialaccount_socialtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialtoken
    ADD CONSTRAINT socialaccount_socialtoken_pkey PRIMARY KEY (id);


--
-- Name: account_emailaddress_email_03be32b2_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX account_emailaddress_email_03be32b2_like ON public.account_emailaddress USING btree (email varchar_pattern_ops);


--
-- Name: account_emailaddress_user_id_2c513194; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX account_emailaddress_user_id_2c513194 ON public.account_emailaddress USING btree (user_id);


--
-- Name: account_emailconfirmation_email_address_id_5b7f8c58; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX account_emailconfirmation_email_address_id_5b7f8c58 ON public.account_emailconfirmation USING btree (email_address_id);


--
-- Name: account_emailconfirmation_key_f43612bd_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX account_emailconfirmation_key_f43612bd_like ON public.account_emailconfirmation USING btree (key varchar_pattern_ops);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: auth_user_groups_group_id_97559544; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_user_groups_group_id_97559544 ON public.auth_user_groups USING btree (group_id);


--
-- Name: auth_user_groups_user_id_6a12ed8b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_user_groups_user_id_6a12ed8b ON public.auth_user_groups USING btree (user_id);


--
-- Name: auth_user_user_permissions_permission_id_1fbb5f2c; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_user_user_permissions_permission_id_1fbb5f2c ON public.auth_user_user_permissions USING btree (permission_id);


--
-- Name: auth_user_user_permissions_user_id_a95ead1b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_user_user_permissions_user_id_a95ead1b ON public.auth_user_user_permissions USING btree (user_id);


--
-- Name: auth_user_username_6821ab7c_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX auth_user_username_6821ab7c_like ON public.auth_user USING btree (username varchar_pattern_ops);


--
-- Name: authtoken_token_key_10f0b77e_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX authtoken_token_key_10f0b77e_like ON public.authtoken_token USING btree (key varchar_pattern_ops);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: django_site_domain_a2e37b91_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX django_site_domain_a2e37b91_like ON public.django_site USING btree (domain varchar_pattern_ops);


--
-- Name: engine_attributespec_label_id_274838ef; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_attributespec_label_id_274838ef ON public.engine_attributespec USING btree (label_id);


--
-- Name: engine_clientfile_data_id_24222cd2; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_clientfile_data_id_24222cd2 ON public.engine_clientfile USING btree (data_id);


--
-- Name: engine_cloudstorage_organization_id_a9b82f16; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_cloudstorage_organization_id_a9b82f16 ON public.engine_cloudstorage USING btree (organization_id);


--
-- Name: engine_cloudstorage_owner_id_b8773f4a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_cloudstorage_owner_id_b8773f4a ON public.engine_cloudstorage USING btree (owner_id);


--
-- Name: engine_comment_author_id_92716231; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_comment_author_id_92716231 ON public.engine_comment USING btree (owner_id);


--
-- Name: engine_comment_issue_id_46db9977; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_comment_issue_id_46db9977 ON public.engine_comment USING btree (issue_id);


--
-- Name: engine_data_cloud_storage_id_e7e0d44a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_data_cloud_storage_id_e7e0d44a ON public.engine_data USING btree (cloud_storage_id);


--
-- Name: engine_image_data_id_e89da547; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_image_data_id_e89da547 ON public.engine_image USING btree (data_id);


--
-- Name: engine_issue_assignee_id_4ce5e564; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_issue_assignee_id_4ce5e564 ON public.engine_issue USING btree (assignee_id);


--
-- Name: engine_issue_job_id_2d12d046; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_issue_job_id_2d12d046 ON public.engine_issue USING btree (job_id);


--
-- Name: engine_issue_owner_id_b1ef7592; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_issue_owner_id_b1ef7592 ON public.engine_issue USING btree (owner_id);


--
-- Name: engine_job_annotator_id_d0696062; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_job_annotator_id_d0696062 ON public.engine_job USING btree (assignee_id);


--
-- Name: engine_job_segment_id_f615a866; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_job_segment_id_f615a866 ON public.engine_job USING btree (segment_id);


--
-- Name: engine_jobcommit_author_id_fe2728f3; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_jobcommit_author_id_fe2728f3 ON public.engine_jobcommit USING btree (owner_id);


--
-- Name: engine_jobcommit_job_id_02b6da1d; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_jobcommit_job_id_02b6da1d ON public.engine_jobcommit USING btree (job_id);


--
-- Name: engine_label_project_id_7f02a656; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_label_project_id_7f02a656 ON public.engine_label USING btree (project_id);


--
-- Name: engine_label_task_id_f11c5c1a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_label_task_id_f11c5c1a ON public.engine_label USING btree (task_id);


--
-- Name: engine_labeledimage_job_id_7406d161; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledimage_job_id_7406d161 ON public.engine_labeledimage USING btree (job_id);


--
-- Name: engine_labeledimage_label_id_b22eb9f7; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledimage_label_id_b22eb9f7 ON public.engine_labeledimage USING btree (label_id);


--
-- Name: engine_labeledimageattributeval_image_id_f4c34a7a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledimageattributeval_image_id_f4c34a7a ON public.engine_labeledimageattributeval USING btree (image_id);


--
-- Name: engine_labeledimageattributeval_spec_id_911f524c; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledimageattributeval_spec_id_911f524c ON public.engine_labeledimageattributeval USING btree (spec_id);


--
-- Name: engine_labeledshape_job_id_b7694c3a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledshape_job_id_b7694c3a ON public.engine_labeledshape USING btree (job_id);


--
-- Name: engine_labeledshape_label_id_872e4658; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledshape_label_id_872e4658 ON public.engine_labeledshape USING btree (label_id);


--
-- Name: engine_labeledshapeattributeval_shape_id_26c4daab; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledshapeattributeval_shape_id_26c4daab ON public.engine_labeledshapeattributeval USING btree (shape_id);


--
-- Name: engine_labeledshapeattributeval_spec_id_144b73fa; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledshapeattributeval_spec_id_144b73fa ON public.engine_labeledshapeattributeval USING btree (spec_id);


--
-- Name: engine_labeledtrack_job_id_e00d9f2f; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledtrack_job_id_e00d9f2f ON public.engine_labeledtrack USING btree (job_id);


--
-- Name: engine_labeledtrack_label_id_75d2c39b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledtrack_label_id_75d2c39b ON public.engine_labeledtrack USING btree (label_id);


--
-- Name: engine_labeledtrackattributeval_spec_id_b7ee6fd2; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledtrackattributeval_spec_id_b7ee6fd2 ON public.engine_labeledtrackattributeval USING btree (spec_id);


--
-- Name: engine_labeledtrackattributeval_track_id_4ed9e160; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_labeledtrackattributeval_track_id_4ed9e160 ON public.engine_labeledtrackattributeval USING btree (track_id);


--
-- Name: engine_manifest_cloud_storage_id_a0af24a9; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_manifest_cloud_storage_id_a0af24a9 ON public.engine_manifest USING btree (cloud_storage_id);


--
-- Name: engine_project_assignee_id_77655de8; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_project_assignee_id_77655de8 ON public.engine_project USING btree (assignee_id);


--
-- Name: engine_project_organization_id_21c08e6b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_project_organization_id_21c08e6b ON public.engine_project USING btree (organization_id);


--
-- Name: engine_project_owner_id_de2a8424; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_project_owner_id_de2a8424 ON public.engine_project USING btree (owner_id);


--
-- Name: engine_relatedfile_data_id_aa10f063; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_relatedfile_data_id_aa10f063 ON public.engine_relatedfile USING btree (data_id);


--
-- Name: engine_relatedfile_primary_image_id_928aa7d5; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_relatedfile_primary_image_id_928aa7d5 ON public.engine_relatedfile USING btree (primary_image_id);


--
-- Name: engine_remotefile_data_id_ff16acda; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_remotefile_data_id_ff16acda ON public.engine_remotefile USING btree (data_id);


--
-- Name: engine_segment_task_id_37d935cf; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_segment_task_id_37d935cf ON public.engine_segment USING btree (task_id);


--
-- Name: engine_serverfile_data_id_2364110a; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_serverfile_data_id_2364110a ON public.engine_serverfile USING btree (data_id);


--
-- Name: engine_task_assignee_id_51c82720; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_task_assignee_id_51c82720 ON public.engine_task USING btree (assignee_id);


--
-- Name: engine_task_data_id_e98ffd9b; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_task_data_id_e98ffd9b ON public.engine_task USING btree (data_id);


--
-- Name: engine_task_organization_id_6640bc33; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_task_organization_id_6640bc33 ON public.engine_task USING btree (organization_id);


--
-- Name: engine_task_owner_id_95de3361; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_task_owner_id_95de3361 ON public.engine_task USING btree (owner_id);


--
-- Name: engine_task_project_id_2dced848; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_task_project_id_2dced848 ON public.engine_task USING btree (project_id);


--
-- Name: engine_trackedshape_track_id_a6dc58bd; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_trackedshape_track_id_a6dc58bd ON public.engine_trackedshape USING btree (track_id);


--
-- Name: engine_trackedshapeattributeval_shape_id_361f0e2f; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_trackedshapeattributeval_shape_id_361f0e2f ON public.engine_trackedshapeattributeval USING btree (shape_id);


--
-- Name: engine_trackedshapeattributeval_spec_id_a944a532; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX engine_trackedshapeattributeval_spec_id_a944a532 ON public.engine_trackedshapeattributeval USING btree (spec_id);


--
-- Name: organizations_invitation_key_514623ce_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_invitation_key_514623ce_like ON public.organizations_invitation USING btree (key varchar_pattern_ops);


--
-- Name: organizations_invitation_owner_id_d8ffe9d9; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_invitation_owner_id_d8ffe9d9 ON public.organizations_invitation USING btree (owner_id);


--
-- Name: organizations_membership_organization_id_6889aa64; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_membership_organization_id_6889aa64 ON public.organizations_membership USING btree (organization_id);


--
-- Name: organizations_membership_user_id_a8e72055; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_membership_user_id_a8e72055 ON public.organizations_membership USING btree (user_id);


--
-- Name: organizations_organization_owner_id_f9657a39; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_organization_owner_id_f9657a39 ON public.organizations_organization USING btree (owner_id);


--
-- Name: organizations_organization_slug_e36fd8f9_like; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX organizations_organization_slug_e36fd8f9_like ON public.organizations_organization USING btree (slug varchar_pattern_ops);


--
-- Name: socialaccount_socialaccount_user_id_8146e70c; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX socialaccount_socialaccount_user_id_8146e70c ON public.socialaccount_socialaccount USING btree (user_id);


--
-- Name: socialaccount_socialapp_sites_site_id_2579dee5; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX socialaccount_socialapp_sites_site_id_2579dee5 ON public.socialaccount_socialapp_sites USING btree (site_id);


--
-- Name: socialaccount_socialapp_sites_socialapp_id_97fb6e7d; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX socialaccount_socialapp_sites_socialapp_id_97fb6e7d ON public.socialaccount_socialapp_sites USING btree (socialapp_id);


--
-- Name: socialaccount_socialtoken_account_id_951f210e; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX socialaccount_socialtoken_account_id_951f210e ON public.socialaccount_socialtoken USING btree (account_id);


--
-- Name: socialaccount_socialtoken_app_id_636a42d7; Type: INDEX; Schema: public; Owner: root
--

CREATE INDEX socialaccount_socialtoken_app_id_636a42d7 ON public.socialaccount_socialtoken USING btree (app_id);


--
-- Name: account_emailaddress account_emailaddress_user_id_2c513194_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailaddress
    ADD CONSTRAINT account_emailaddress_user_id_2c513194_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: account_emailconfirmation account_emailconfirm_email_address_id_5b7f8c58_fk_account_e; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.account_emailconfirmation
    ADD CONSTRAINT account_emailconfirm_email_address_id_5b7f8c58_fk_account_e FOREIGN KEY (email_address_id) REFERENCES public.account_emailaddress(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: authtoken_token authtoken_token_user_id_35299eff_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.authtoken_token
    ADD CONSTRAINT authtoken_token_user_id_35299eff_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_attributespec engine_attributespec_label_id_274838ef_fk_engine_label_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_attributespec
    ADD CONSTRAINT engine_attributespec_label_id_274838ef_fk_engine_label_id FOREIGN KEY (label_id) REFERENCES public.engine_label(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_clientfile engine_clientfile_data_id_24222cd2_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_clientfile
    ADD CONSTRAINT engine_clientfile_data_id_24222cd2_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_cloudstorage engine_cloudstorage_organization_id_a9b82f16_fk_organizat; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_cloudstorage
    ADD CONSTRAINT engine_cloudstorage_organization_id_a9b82f16_fk_organizat FOREIGN KEY (organization_id) REFERENCES public.organizations_organization(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_cloudstorage engine_cloudstorage_owner_id_b8773f4a_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_cloudstorage
    ADD CONSTRAINT engine_cloudstorage_owner_id_b8773f4a_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_comment engine_comment_issue_id_46db9977_fk_engine_issue_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_comment
    ADD CONSTRAINT engine_comment_issue_id_46db9977_fk_engine_issue_id FOREIGN KEY (issue_id) REFERENCES public.engine_issue(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_comment engine_comment_owner_id_c700667b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_comment
    ADD CONSTRAINT engine_comment_owner_id_c700667b_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_data engine_data_cloud_storage_id_e7e0d44a_fk_engine_cloudstorage_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_data
    ADD CONSTRAINT engine_data_cloud_storage_id_e7e0d44a_fk_engine_cloudstorage_id FOREIGN KEY (cloud_storage_id) REFERENCES public.engine_cloudstorage(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_image engine_image_data_id_e89da547_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_image
    ADD CONSTRAINT engine_image_data_id_e89da547_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_issue engine_issue_assignee_id_4ce5e564_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_issue
    ADD CONSTRAINT engine_issue_assignee_id_4ce5e564_fk_auth_user_id FOREIGN KEY (assignee_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_issue engine_issue_job_id_2d12d046_fk_engine_job_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_issue
    ADD CONSTRAINT engine_issue_job_id_2d12d046_fk_engine_job_id FOREIGN KEY (job_id) REFERENCES public.engine_job(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_issue engine_issue_owner_id_b1ef7592_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_issue
    ADD CONSTRAINT engine_issue_owner_id_b1ef7592_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_job engine_job_assignee_id_b80bea03_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_job
    ADD CONSTRAINT engine_job_assignee_id_b80bea03_fk_auth_user_id FOREIGN KEY (assignee_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_job engine_job_segment_id_f615a866_fk_engine_segment_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_job
    ADD CONSTRAINT engine_job_segment_id_f615a866_fk_engine_segment_id FOREIGN KEY (segment_id) REFERENCES public.engine_segment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_jobcommit engine_jobcommit_job_id_02b6da1d_fk_engine_job_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_jobcommit
    ADD CONSTRAINT engine_jobcommit_job_id_02b6da1d_fk_engine_job_id FOREIGN KEY (job_id) REFERENCES public.engine_job(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_jobcommit engine_jobcommit_owner_id_3de5f6de_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_jobcommit
    ADD CONSTRAINT engine_jobcommit_owner_id_3de5f6de_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_label engine_label_project_id_7f02a656_fk_engine_project_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_label
    ADD CONSTRAINT engine_label_project_id_7f02a656_fk_engine_project_id FOREIGN KEY (project_id) REFERENCES public.engine_project(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_label engine_label_task_id_f11c5c1a_fk_engine_task_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_label
    ADD CONSTRAINT engine_label_task_id_f11c5c1a_fk_engine_task_id FOREIGN KEY (task_id) REFERENCES public.engine_task(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledimage engine_labeledimage_job_id_7406d161_fk_engine_job_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimage
    ADD CONSTRAINT engine_labeledimage_job_id_7406d161_fk_engine_job_id FOREIGN KEY (job_id) REFERENCES public.engine_job(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledimage engine_labeledimage_label_id_b22eb9f7_fk_engine_label_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimage
    ADD CONSTRAINT engine_labeledimage_label_id_b22eb9f7_fk_engine_label_id FOREIGN KEY (label_id) REFERENCES public.engine_label(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledimageattributeval engine_labeledimagea_image_id_f4c34a7a_fk_engine_la; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimageattributeval
    ADD CONSTRAINT engine_labeledimagea_image_id_f4c34a7a_fk_engine_la FOREIGN KEY (image_id) REFERENCES public.engine_labeledimage(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledimageattributeval engine_labeledimagea_spec_id_911f524c_fk_engine_at; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledimageattributeval
    ADD CONSTRAINT engine_labeledimagea_spec_id_911f524c_fk_engine_at FOREIGN KEY (spec_id) REFERENCES public.engine_attributespec(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledshape engine_labeledshape_job_id_b7694c3a_fk_engine_job_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshape
    ADD CONSTRAINT engine_labeledshape_job_id_b7694c3a_fk_engine_job_id FOREIGN KEY (job_id) REFERENCES public.engine_job(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledshape engine_labeledshape_label_id_872e4658_fk_engine_label_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshape
    ADD CONSTRAINT engine_labeledshape_label_id_872e4658_fk_engine_label_id FOREIGN KEY (label_id) REFERENCES public.engine_label(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledshapeattributeval engine_labeledshapea_shape_id_26c4daab_fk_engine_la; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshapeattributeval
    ADD CONSTRAINT engine_labeledshapea_shape_id_26c4daab_fk_engine_la FOREIGN KEY (shape_id) REFERENCES public.engine_labeledshape(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledshapeattributeval engine_labeledshapea_spec_id_144b73fa_fk_engine_at; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledshapeattributeval
    ADD CONSTRAINT engine_labeledshapea_spec_id_144b73fa_fk_engine_at FOREIGN KEY (spec_id) REFERENCES public.engine_attributespec(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledtrack engine_labeledtrack_job_id_e00d9f2f_fk_engine_job_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrack
    ADD CONSTRAINT engine_labeledtrack_job_id_e00d9f2f_fk_engine_job_id FOREIGN KEY (job_id) REFERENCES public.engine_job(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledtrack engine_labeledtrack_label_id_75d2c39b_fk_engine_label_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrack
    ADD CONSTRAINT engine_labeledtrack_label_id_75d2c39b_fk_engine_label_id FOREIGN KEY (label_id) REFERENCES public.engine_label(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledtrackattributeval engine_labeledtracka_spec_id_b7ee6fd2_fk_engine_at; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrackattributeval
    ADD CONSTRAINT engine_labeledtracka_spec_id_b7ee6fd2_fk_engine_at FOREIGN KEY (spec_id) REFERENCES public.engine_attributespec(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_labeledtrackattributeval engine_labeledtracka_track_id_4ed9e160_fk_engine_la; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_labeledtrackattributeval
    ADD CONSTRAINT engine_labeledtracka_track_id_4ed9e160_fk_engine_la FOREIGN KEY (track_id) REFERENCES public.engine_labeledtrack(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_manifest engine_manifest_cloud_storage_id_a0af24a9_fk_engine_cl; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_manifest
    ADD CONSTRAINT engine_manifest_cloud_storage_id_a0af24a9_fk_engine_cl FOREIGN KEY (cloud_storage_id) REFERENCES public.engine_cloudstorage(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_profile engine_profile_user_id_19972afd_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_profile
    ADD CONSTRAINT engine_profile_user_id_19972afd_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_project engine_project_assignee_id_77655de8_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_project
    ADD CONSTRAINT engine_project_assignee_id_77655de8_fk_auth_user_id FOREIGN KEY (assignee_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_project engine_project_organization_id_21c08e6b_fk_organizat; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_project
    ADD CONSTRAINT engine_project_organization_id_21c08e6b_fk_organizat FOREIGN KEY (organization_id) REFERENCES public.organizations_organization(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_project engine_project_owner_id_de2a8424_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_project
    ADD CONSTRAINT engine_project_owner_id_de2a8424_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_relatedfile engine_relatedfile_data_id_aa10f063_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_relatedfile
    ADD CONSTRAINT engine_relatedfile_data_id_aa10f063_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_relatedfile engine_relatedfile_primary_image_id_928aa7d5_fk_engine_image_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_relatedfile
    ADD CONSTRAINT engine_relatedfile_primary_image_id_928aa7d5_fk_engine_image_id FOREIGN KEY (primary_image_id) REFERENCES public.engine_image(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_remotefile engine_remotefile_data_id_ff16acda_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_remotefile
    ADD CONSTRAINT engine_remotefile_data_id_ff16acda_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_segment engine_segment_task_id_37d935cf_fk_engine_task_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_segment
    ADD CONSTRAINT engine_segment_task_id_37d935cf_fk_engine_task_id FOREIGN KEY (task_id) REFERENCES public.engine_task(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_serverfile engine_serverfile_data_id_2364110a_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_serverfile
    ADD CONSTRAINT engine_serverfile_data_id_2364110a_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_task engine_task_assignee_id_51c82720_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_assignee_id_51c82720_fk_auth_user_id FOREIGN KEY (assignee_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_task engine_task_data_id_e98ffd9b_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_data_id_e98ffd9b_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_task engine_task_organization_id_6640bc33_fk_organizat; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_organization_id_6640bc33_fk_organizat FOREIGN KEY (organization_id) REFERENCES public.organizations_organization(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_task engine_task_owner_id_95de3361_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_owner_id_95de3361_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_task engine_task_project_id_2dced848_fk_engine_project_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_task
    ADD CONSTRAINT engine_task_project_id_2dced848_fk_engine_project_id FOREIGN KEY (project_id) REFERENCES public.engine_project(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_trackedshape engine_trackedshape_track_id_a6dc58bd_fk_engine_labeledtrack_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshape
    ADD CONSTRAINT engine_trackedshape_track_id_a6dc58bd_fk_engine_labeledtrack_id FOREIGN KEY (track_id) REFERENCES public.engine_labeledtrack(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_trackedshapeattributeval engine_trackedshapea_shape_id_361f0e2f_fk_engine_tr; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshapeattributeval
    ADD CONSTRAINT engine_trackedshapea_shape_id_361f0e2f_fk_engine_tr FOREIGN KEY (shape_id) REFERENCES public.engine_trackedshape(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_trackedshapeattributeval engine_trackedshapea_spec_id_a944a532_fk_engine_at; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_trackedshapeattributeval
    ADD CONSTRAINT engine_trackedshapea_spec_id_a944a532_fk_engine_at FOREIGN KEY (spec_id) REFERENCES public.engine_attributespec(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: engine_video engine_video_data_id_b37015e9_fk_engine_data_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.engine_video
    ADD CONSTRAINT engine_video_data_id_b37015e9_fk_engine_data_id FOREIGN KEY (data_id) REFERENCES public.engine_data(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: dataset_repo_gitdata git_gitdata_task_id_a6f2ea20_fk_engine_task_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.dataset_repo_gitdata
    ADD CONSTRAINT git_gitdata_task_id_a6f2ea20_fk_engine_task_id FOREIGN KEY (task_id) REFERENCES public.engine_task(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organizations_invitation organizations_invita_membership_id_d0265539_fk_organizat; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_invitation
    ADD CONSTRAINT organizations_invita_membership_id_d0265539_fk_organizat FOREIGN KEY (membership_id) REFERENCES public.organizations_membership(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organizations_invitation organizations_invitation_owner_id_d8ffe9d9_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_invitation
    ADD CONSTRAINT organizations_invitation_owner_id_d8ffe9d9_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organizations_membership organizations_member_organization_id_6889aa64_fk_organizat; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_membership
    ADD CONSTRAINT organizations_member_organization_id_6889aa64_fk_organizat FOREIGN KEY (organization_id) REFERENCES public.organizations_organization(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organizations_membership organizations_membership_user_id_a8e72055_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_membership
    ADD CONSTRAINT organizations_membership_user_id_a8e72055_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organizations_organization organizations_organization_owner_id_f9657a39_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.organizations_organization
    ADD CONSTRAINT organizations_organization_owner_id_f9657a39_fk_auth_user_id FOREIGN KEY (owner_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: socialaccount_socialtoken socialaccount_social_account_id_951f210e_fk_socialacc; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialtoken
    ADD CONSTRAINT socialaccount_social_account_id_951f210e_fk_socialacc FOREIGN KEY (account_id) REFERENCES public.socialaccount_socialaccount(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: socialaccount_socialtoken socialaccount_social_app_id_636a42d7_fk_socialacc; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialtoken
    ADD CONSTRAINT socialaccount_social_app_id_636a42d7_fk_socialacc FOREIGN KEY (app_id) REFERENCES public.socialaccount_socialapp(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: socialaccount_socialapp_sites socialaccount_social_site_id_2579dee5_fk_django_si; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp_sites
    ADD CONSTRAINT socialaccount_social_site_id_2579dee5_fk_django_si FOREIGN KEY (site_id) REFERENCES public.django_site(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: socialaccount_socialapp_sites socialaccount_social_socialapp_id_97fb6e7d_fk_socialacc; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialapp_sites
    ADD CONSTRAINT socialaccount_social_socialapp_id_97fb6e7d_fk_socialacc FOREIGN KEY (socialapp_id) REFERENCES public.socialaccount_socialapp(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: socialaccount_socialaccount socialaccount_socialaccount_user_id_8146e70c_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.socialaccount_socialaccount
    ADD CONSTRAINT socialaccount_socialaccount_user_id_8146e70c_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: root
--

GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

