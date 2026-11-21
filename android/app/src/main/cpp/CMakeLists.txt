# Adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0),
# android/app/src/main/cpp/CMakeLists.txt. Changes: project/library names.
cmake_minimum_required(VERSION 3.22.1)
project(stm_node)
add_library(node SHARED IMPORTED)
set_target_properties(node PROPERTIES IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libnode.so)
add_library(stm_node SHARED node_bridge.cpp)
target_compile_features(stm_node PRIVATE cxx_std_20)
target_include_directories(stm_node PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/node-include)
target_link_libraries(stm_node node log)
target_link_options(stm_node PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")
